import { supabase } from "@/integrations/supabase/client";
import { fetchPlanningDaySlotsForDates, normalizePratiqueCreneau, resolvePratiqueSlotParts } from "@/lib/pratiqueSlots";
import { PRATIQUE_TYPES } from "@/lib/sessionTypes";

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
    .select("date_choisie, type_formation, apprenant_id, creneau");
  if (fromDate) query = query.gte("date_choisie", fromDate);

  const { data: reservations, error: resError } = await query;
  if (resError) {
    result.errors.push(resError.message);
    return result;
  }

  // Regroupement par date
  const byDate = new Map<string, { type: "vtc" | "taxi"; apprenants: Map<string, string | null> }>();
  (reservations || []).forEach((r: any) => {
    if (!r.date_choisie || !r.apprenant_id) return;
    const type: "vtc" | "taxi" = (r.type_formation || "vtc").toLowerCase() === "taxi" ? "taxi" : "vtc";
    const entry = byDate.get(r.date_choisie) || { type, apprenants: new Map<string, string | null>() };
    entry.type = type;
    entry.apprenants.set(r.apprenant_id, r.creneau || null);
    byDate.set(r.date_choisie, entry);
  });

  const dates = Array.from(byDate.keys()).sort();
  if (dates.length === 0) return result;
  result.datesChecked = dates.length;
  const planningSlots = await fetchPlanningDaySlotsForDates(dates);

  // Sessions pratiques existantes sur la plage concernée
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, nom, date_debut, date_fin, type_session")
    .in("type_session", PRATIQUE_TYPES)
    .gte("date_debut", dates[0])
    .lte("date_debut", dates[dates.length - 1]);

  const sessionByDate = new Map<string, { id: string; nom: string | null }>();
  (sessions || []).forEach((s: any) => sessionByDate.set(s.date_debut, { id: s.id, nom: s.nom }));

  for (const date of dates) {
    const { type, apprenants } = byDate.get(date)!;
    const allParts = resolvePratiqueSlotParts(planningSlots.get(date), type, "journee");
    const firstStart = allParts.map((part) => part.startMinute).filter((value): value is number => value != null).sort((a, b) => a - b)[0];
    const lastEnd = allParts.map((part) => part.endMinute).filter((value): value is number => value != null).sort((a, b) => b - a)[0];
    const toTime = (minutes: number | undefined, fallback: string) => minutes == null
      ? fallback
      : `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    const sessionStart = toTime(firstStart, "09:00");
    const sessionEnd = toTime(lastEnd, "12:00");
    let session = sessionByDate.get(date);

    // 1) Créer la session manquante
    if (!session) {
      const nom = `Formation pratique ${type.toUpperCase()} - ${labelDate(date)}`;
      const { data: created, error: createErr } = await supabase
        .from("sessions")
        .insert({
          nom,
          type_session: `pratique_${type.toLowerCase()}`,
          date_debut: date,
          date_fin: date,
          heure_debut: sessionStart,
          heure_fin: sessionEnd,
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
      await supabase.from("sessions").update({ heure_debut: sessionStart, heure_fin: sessionEnd }).eq("id", session.id);
    }

    // 3) Inscrire les apprenants manquants
    const { data: existing } = await supabase
      .from("session_apprenants")
      .select("apprenant_id")
      .eq("session_id", session.id);
    const already = new Set((existing || []).map((e: any) => e.apprenant_id));

    const toInsert = Array.from(apprenants.entries())
      .filter(([id]) => !already.has(id))
      .map(([id, creneau]) => {
        const parts = resolvePratiqueSlotParts(planningSlots.get(date), type, normalizePratiqueCreneau(creneau));
        const starts = parts.map((part) => part.startMinute).filter((value): value is number => value != null).sort((a, b) => a - b);
        const ends = parts.map((part) => part.endMinute).filter((value): value is number => value != null).sort((a, b) => b - a);
        return {
        session_id: session!.id,
        apprenant_id: id,
        montant_total: 0,
        montant_paye: 0,
        mode_financement: "personnel",
        heure_debut_personnalisee: toTime(starts[0], sessionStart),
        heure_fin_personnalisee: toTime(ends[0], sessionEnd),
      };
      });

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

export interface CoherenceIssueApprenant {
  date: string;
  label: string;
  sessionNom: string;
  apprenants: string[];
}

export interface CoherenceIssueSession {
  date: string;
  label: string;
  sessionNom: string;
  inscrits: number;
}

export interface PratiqueCoherenceReport {
  apprenantsManquants: CoherenceIssueApprenant[];
  sessionsHorsCalendrier: CoherenceIssueSession[];
  datesSansSession: Array<{ date: string; label: string; reservations: number }>;
  total: number;
}

/**
 * Vérifie la cohérence entre le planning (reservations_pratique) et les sessions
 * pratiques, sans rien modifier. Utilisé pour alerter l'admin avant l'affichage
 * du planning.
 */
export async function checkPratiqueSessionsCoherence(
  fromDate?: string
): Promise<PratiqueCoherenceReport> {
  const report: PratiqueCoherenceReport = {
    apprenantsManquants: [],
    sessionsHorsCalendrier: [],
    datesSansSession: [],
    total: 0,
  };

  let query = supabase
    .from("reservations_pratique")
    .select("date_choisie, type_formation, apprenant_id");
  if (fromDate) query = query.gte("date_choisie", fromDate);
  const { data: reservations } = await query;

  const byDate = new Map<string, Set<string>>();
  (reservations || []).forEach((r: any) => {
    if (!r.date_choisie || !r.apprenant_id) return;
    const set = byDate.get(r.date_choisie) || new Set<string>();
    set.add(r.apprenant_id);
    byDate.set(r.date_choisie, set);
  });

  let sessionsQuery = supabase
    .from("sessions")
    .select("id, nom, date_debut")
    .in("type_session", PRATIQUE_TYPES);
  if (fromDate) sessionsQuery = sessionsQuery.gte("date_debut", fromDate);
  const { data: sessions } = await sessionsQuery;

  const sessionIds = (sessions || []).map((s: any) => s.id);
  const membersBySession = new Map<string, Set<string>>();
  if (sessionIds.length > 0) {
    const { data: links } = await supabase
      .from("session_apprenants")
      .select("session_id, apprenant_id")
      .in("session_id", sessionIds);
    (links || []).forEach((l: any) => {
      const set = membersBySession.get(l.session_id) || new Set<string>();
      set.add(l.apprenant_id);
      membersBySession.set(l.session_id, set);
    });
  }

  // Noms des apprenants concernés
  const allIds = new Set<string>();
  byDate.forEach((set) => set.forEach((id) => allIds.add(id)));
  const nameById = new Map<string, string>();
  if (allIds.size > 0) {
    const { data: apprenants } = await supabase
      .from("apprenants")
      .select("id, nom, prenom")
      .in("id", Array.from(allIds));
    (apprenants || []).forEach((a: any) =>
      nameById.set(a.id, `${(a.nom || "").toUpperCase()} ${a.prenom || ""}`.trim())
    );
  }

  const sessionByDate = new Map<string, any>();
  (sessions || []).forEach((s: any) => sessionByDate.set(s.date_debut, s));

  // 1) Dates réservées sans aucune session
  byDate.forEach((set, date) => {
    if (!sessionByDate.has(date)) {
      report.datesSansSession.push({ date, label: labelDate(date), reservations: set.size });
    }
  });

  // 2) Apprenants du planning absents de la session correspondante
  byDate.forEach((set, date) => {
    const session = sessionByDate.get(date);
    if (!session) return;
    const members = membersBySession.get(session.id) || new Set<string>();
    const missing = Array.from(set)
      .filter((id) => !members.has(id))
      .map((id) => nameById.get(id) || id);
    if (missing.length > 0) {
      report.apprenantsManquants.push({
        date,
        label: labelDate(date),
        sessionNom: session.nom || "Session pratique",
        apprenants: missing.sort(),
      });
    }
  });

  // 3) Sessions pratiques qui ne correspondent à aucune date du planning
  (sessions || []).forEach((s: any) => {
    if (!byDate.has(s.date_debut)) {
      report.sessionsHorsCalendrier.push({
        date: s.date_debut,
        label: labelDate(s.date_debut),
        sessionNom: s.nom || "Session pratique",
        inscrits: (membersBySession.get(s.id) || new Set()).size,
      });
    }
  });

  report.apprenantsManquants.sort((a, b) => a.date.localeCompare(b.date));
  report.sessionsHorsCalendrier.sort((a, b) => a.date.localeCompare(b.date));
  report.datesSansSession.sort((a, b) => a.date.localeCompare(b.date));
  report.total =
    report.apprenantsManquants.length +
    report.sessionsHorsCalendrier.length +
    report.datesSansSession.length;

  return report;
}
