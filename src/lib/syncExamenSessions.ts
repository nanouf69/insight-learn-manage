import { supabase } from "@/integrations/supabase/client";
import { ALL_DATES_EXAMEN_THEORIQUE } from "@/lib/examDatesConfig";

/**
 * Sessions "Examen théorique" : une session par date d'examen officielle,
 * contenant UNIQUEMENT les apprenants e-learning inscrits à cette date.
 *
 * Aucune suppression de session : on crée les manquantes et on ajoute les
 * apprenants manquants (les inscriptions manuelles sont conservées).
 */

const MOIS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

const deaccent = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/** "29 septembre 2026" -> "2026-09-29" */
export function parseDateExamen(label: string): string | null {
  const m = deaccent(label).match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (!m) return null;
  const mois = MOIS[m[2]];
  if (!mois) return null;
  return `${m[3]}-${String(mois).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}

/** Un apprenant est en e-learning si son type se termine par "-e" ou contient "e-learning" */
export function isElearningType(type?: string | null): boolean {
  const t = deaccent(String(type || ""));
  return /(-e$|-e-|e-learning)/.test(t);
}

export interface SyncExamenResult {
  sessionsCreated: number;
  apprenantsAdded: number;
  datesChecked: number;
  errors: string[];
}

export async function syncExamenSessions(): Promise<SyncExamenResult> {
  const result: SyncExamenResult = { sessionsCreated: 0, apprenantsAdded: 0, datesChecked: 0, errors: [] };

  const { data: apprenants, error: apErr } = await supabase
    .from("apprenants")
    .select("id, type_apprenant, statut, date_examen_theorique")
    .is("deleted_at", null);


  if (apErr) {
    result.errors.push(apErr.message);
    return result;
  }

  const { data: existingSessions, error: sErr } = await supabase
    .from("sessions")
    .select("id, nom, date_debut, type_session");

  if (sErr) {
    result.errors.push(sErr.message);
    return result;
  }

  for (const exam of ALL_DATES_EXAMEN_THEORIQUE) {
    const iso = parseDateExamen(exam.date);
    if (!iso) continue;
    result.datesChecked++;

    const inscrits = (apprenants || []).filter((a: any) => {
      const statut = deaccent(String(a.statut || ""));
      if (["prospect", "annule", "abandon", "desinscrit"].includes(statut)) return false;
      return deaccent(String(a.date_examen_theorique || "")) === deaccent(exam.date);
    });


    const nom = `Session examen — ${exam.date}`;

    let session = (existingSessions || []).find(
      (s: any) => s.type_session === "examen" && s.date_debut === iso,
    );

    if (!session) {
      if (inscrits.length === 0) continue;
      const { data: created, error: cErr } = await supabase
        .from("sessions")
        .insert({
          nom,
          date_debut: iso,
          date_fin: iso,
          lieu: exam.lieu,
          type_session: "examen",
          statut: "planifiee",
          places_disponibles: 200,
          types_apprenant: [],
          creneaux: [],
          heure_debut: "14:00",
          heure_fin: "16:00",
        })
        .select("id, nom, date_debut, type_session")
        .single();
      if (cErr || !created) {
        result.errors.push(`${exam.date}: ${cErr?.message || "création impossible"}`);
        continue;
      }
      session = created;
      result.sessionsCreated++;
    }

    if (inscrits.length === 0) continue;

    const { data: liens } = await supabase
      .from("session_apprenants")
      .select("apprenant_id")
      .eq("session_id", session.id);
    const dejaInscrits = new Set((liens || []).map((l: any) => l.apprenant_id));

    const toInsert = inscrits
      .filter((a: any) => !dejaInscrits.has(a.id))
      .map((a: any) => ({
        session_id: session!.id,
        apprenant_id: a.id,
        date_debut: iso,
        date_fin: iso,
      }));

    if (toInsert.length > 0) {
      const { error: iErr } = await supabase.from("session_apprenants").insert(toInsert);
      if (iErr) result.errors.push(`${exam.date}: ${iErr.message}`);
      else result.apprenantsAdded += toInsert.length;
    }
  }

  return result;
}
