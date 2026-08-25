import { supabase } from "@/integrations/supabase/client";
import type { CreneauKey } from "@/lib/agendaSlots";

/**
 * Émargement numérique des journées de formation PRATIQUE.
 *
 * Source de vérité = le PLANNING pratique :
 *  - `reservations_pratique` (date choisie par l'apprenant dans le portail)
 *  - complété par les sessions de type "pratique" auxquelles il est inscrit.
 *
 * Chaque journée pratique attend 2 signatures : matin + après-midi.
 */

const formatISO = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const isDue = (iso: string, creneau: CreneauKey, todayISO: string, nowMin: number) => {
  if (iso < todayISO) return true;
  if (iso > todayISO) return false;
  return creneau === "matin" ? nowMin >= 8 * 60 + 30 : nowMin >= 12 * 60 + 30;
};

/** Toutes les dates de formation pratique planifiées pour un apprenant (ISO, triées). */
export const getPratiqueDates = async (apprenantId: string): Promise<string[]> => {
  if (!apprenantId) return [];
  const dates = new Set<string>();

  const [resRes, sessRes] = await Promise.all([
    supabase
      .from("reservations_pratique")
      .select("date_choisie")
      .eq("apprenant_id", apprenantId),
    supabase
      .from("session_apprenants")
      .select("sessions:session_id(type_session, date_debut, date_fin)")
      .eq("apprenant_id", apprenantId),
  ]);

  for (const row of ((resRes.data as any[]) || [])) {
    const d = String(row?.date_choisie || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) dates.add(d);
  }

  for (const row of ((sessRes.data as any[]) || [])) {
    const s = row?.sessions;
    if (!s || String(s.type_session || "") !== "pratique") continue;
    const debut = String(s.date_debut || "").slice(0, 10);
    const fin = String(s.date_fin || s.date_debut || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(debut)) continue;
    const cur = new Date(debut + "T00:00:00");
    const end = new Date((/^\d{4}-\d{2}-\d{2}$/.test(fin) ? fin : debut) + "T00:00:00");
    let guard = 0;
    while (cur <= end && guard < 31) {
      dates.add(formatISO(cur));
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
  }

  return Array.from(dates).sort();
};

/**
 * Créneaux d'émargement pratique attendus (déjà échus) et non encore signés
 * par l'apprenant.
 */
export const getExpectedPratiqueEmargements = async (
  apprenantId: string,
): Promise<Array<{ date: string; creneau: CreneauKey }>> => {
  const dates = await getPratiqueDates(apprenantId);
  if (dates.length === 0) return [];

  const now = new Date();
  const todayISO = formatISO(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const out: Array<{ date: string; creneau: CreneauKey }> = [];
  for (const date of dates) {
    for (const creneau of ["matin", "apres_midi"] as CreneauKey[]) {
      if (isDue(date, creneau, todayISO, nowMin)) out.push({ date, creneau });
    }
  }
  return out;
};

export interface PratiqueSignatureRow {
  matin?: string | null;
  apres_midi?: string | null;
  matinAbsent?: boolean;
  apresMidiAbsent?: boolean;
}

/**
 * Récupère les signatures numériques déjà collectées pour une journée pratique.
 * Retourne une map apprenant_id -> signatures matin / après-midi.
 */
export const fetchPratiqueSignatures = async (
  dateISO: string,
  apprenantIds: string[],
): Promise<Record<string, PratiqueSignatureRow>> => {
  const map: Record<string, PratiqueSignatureRow> = {};
  const ids = apprenantIds.filter(Boolean);
  if (!dateISO || ids.length === 0) return map;

  const { data } = await supabase
    .from("emargements_fc" as any)
    .select("apprenant_id, demi_journee, signature_data_url, absent")
    .eq("date_emargement", dateISO)
    .in("apprenant_id", ids);

  for (const row of ((data as any[]) || [])) {
    const id = String(row.apprenant_id);
    if (!map[id]) map[id] = {};
    const sig = String(row.signature_data_url || "").trim() || null;
    if (row.demi_journee === "matin") {
      map[id].matin = sig;
      map[id].matinAbsent = row.absent === true;
    } else if (row.demi_journee === "apres_midi") {
      map[id].apres_midi = sig;
      map[id].apresMidiAbsent = row.absent === true;
    }
  }
  return map;
};
