import { supabase } from "@/integrations/supabase/client";

/**
 * Synchronise les sessions "pratique" avec le planning (table reservations_pratique).
 *
 * Règle : le planning fait foi. Pour chaque date réservée :
 *  - une session pratique doit exister (créée si manquante, avec le bon type VTC/TAXI)
 *  - tous les apprenants réservés ce jour-là doivent être inscrits à cette session
 *
 * Aucune suppression n'est effectuée : les apprenants ajoutés manuellement à une
 * session restent en place.
 */

const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MOIS = ["jan", "fév", "mar", "avr", "mai", "jun", "jui", "aoû", "sep", "oct", "nov", "déc"];

function labelDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${JOURS[dt.getDay()]} ${d} ${MOIS[m - 1]}`;
}

export interface SyncPratiqueResult {
  sessionsCreated: number;
  apprenantsAdded: number;
  datesChecked: number;
  errors: string[];
}

export async function syncPratiqueSessionsFromPlanning(
  fromDate?: string
): Promise<SyncPratiqueResult> {
  const result: SyncPratiqueResult = {
    sessionsCreated: 0,
    apprenantsAdded: 0,
    datesChecked: 0,
    errors: [],
  };

  let query = supabase
    .from("reservations_pratique")
    .select("date_choisie, type_formation, apprenant_id");
  if (fromDate) query = query.gte("date_choisie", fromDate);

  const { data: reservations, error: resError } = await query;
  if (resError) {
    result.errors.push(resError.message);
    return result;
  }

  // Regroupement par date
  const byDate = new Map<string, { type: "vtc" | "taxi"; apprenants: Set<string> }>();
  (reservations || []).forEach((r: any) => {
    if (!r.date_choisie || !r.apprenant_id) return;
    const type: "vtc" | "taxi" = (r.type_formation || "vtc").toLowerCase() === "taxi" ? "taxi" : "vtc";
    const entry = byDate.get(r.date_choisie) || { type, apprenants: new Set<string>() };
    entry.type = type;
    entry.apprenants.add(r.apprenant_id);
    byDate.set(r.date_choisie, entry);
  });

  const dates = Array.from(byDate.keys()).sort();
  if (dates.length === 0) return result;
  result.datesChecked = dates.length;

  // Sessions pratiques existantes sur la plage concernée
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, nom, date_debut, date_fin, type_session")
    .eq("type_session", "pratique")
    .gte("date_debut", dates[0])
    .lte("date_debut", dates[dates.length - 1]);

  const sessionByDate = new Map<string, { id: string; nom: string | null }>();
  (sessions || []).forEach((s: any) => sessionByDate.set(s.date_debut, { id: s.id, nom: s.nom }));

  for (const date of dates) {
    const { type, apprenants } = byDate.get(date)!;
    let session = sessionByDate.get(date);

    // 1) Créer la session manquante
    if (!session) {
      const nom = `Formation pratique ${type.toUpperCase()} - ${labelDate(date)}`;
      const { data: created, error: createErr } = await supabase
        .from("sessions")
        .insert({
          nom,
          type_session: "pratique",
          date_debut: date,
          date_fin: date,
          heure_debut: "09:00",
          heure_fin: type === "taxi" ? "17:30" : "17:00",
          lieu: "86 Route de Genas, 69003 Lyon",
          statut: "planifiee",
          places_disponibles: 3,
          types_apprenant: [type.toUpperCase()],
        } as any)
        .select("id, nom")
        .single();
      if (createErr || !created) {
        result.errors.push(`${date}: ${createErr?.message || "création impossible"}`);
        continue;
      }
      session = { id: created.id, nom: created.nom };
      sessionByDate.set(date, session);
      result.sessionsCreated++;
    } else {
      // 2) Corriger le type dans le nom si le planning dit autre chose
      const nomLower = (session.nom || "").toLowerCase();
      const nomType = nomLower.includes("taxi") && !nomLower.includes("vtc") ? "taxi" : "vtc";
      if (nomType !== type) {
        const nouveauNom = `Formation pratique ${type.toUpperCase()} - ${labelDate(date)}`;
        await supabase.from("sessions").update({ nom: nouveauNom }).eq("id", session.id);
        session.nom = nouveauNom;
      }
    }

    // 3) Inscrire les apprenants manquants
    const { data: existing } = await supabase
      .from("session_apprenants")
      .select("apprenant_id")
      .eq("session_id", session.id);
    const already = new Set((existing || []).map((e: any) => e.apprenant_id));

    const toInsert = Array.from(apprenants)
      .filter((id) => !already.has(id))
      .map((id) => ({
        session_id: session!.id,
        apprenant_id: id,
        montant_total: 0,
        montant_paye: 0,
        mode_financement: "personnel",
      }));

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from("session_apprenants").insert(toInsert as any);
      if (insErr) {
        result.errors.push(`${date}: ${insErr.message}`);
      } else {
        result.apprenantsAdded += toInsert.length;
      }
    }
  }

  return result;
}
