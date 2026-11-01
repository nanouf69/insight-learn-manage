import { daySlotsDepuisConfigs, normalizePratiqueCreneau, normalizePratiqueType, parseClockMinutes, resolvePratiqueSlotParts } from '@/lib/pratiqueSlots';
import { creneauxSessionInscrite } from '@/lib/emargementSessionSlots';

const dateISO = (v: unknown) => String(v ?? '').slice(0, 10);
const dateValide = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const retenue = (r: any) => r?.sessions && r.liste_attente !== true && r.emargements_exclus !== true && !/annul|abandon|exclu|attente/i.test(`${r.sessions.statut ?? ''} ${r.statut_suivi ?? ''}`);

export function slotsSignatures(start: unknown, end: unknown): string[] {
  const a = parseClockMinutes(String(start ?? '')), b = parseClockMinutes(String(end ?? ''));
  if (a == null || b == null || b <= a) return [];
  return [ ...(a < 720 && b > 0 ? ['matin'] : []), ...(a < 1020 && b > 780 ? ['apres_midi'] : []), ...(a < 1110 && b > 1020 ? ['soir_1'] : []), ...(a < 1440 && b > 1110 ? ['soir_2'] : []) ];
}

/** Live read-only plan: one immutable date/slot identity, never generated sheets or a curriculum quota. */
export function planningSignaturesReel(inscriptions: any[], reservations: any[], blocs: any[], configs: any[], filiere: string) {
  const creneaux = new Map<string, boolean>();
  let incomplet = false;
  const ajouter = (date: string, keys: string[], pratique: boolean) => {
    if (!dateValide(date) || !keys.length) { incomplet = true; return; }
    for (const key of keys) creneaux.set(`${date}|${key}`, pratique || creneaux.get(`${date}|${key}`) === true);
  };
  const dates = [...reservations.map(r => dateISO(r.date_choisie)), ...inscriptions.filter(r => /pratique/i.test(r.sessions?.type_session ?? '')).map(r => dateISO(r.sessions.date_debut))];
  const daySlots = daySlotsDepuisConfigs(dates, configs);
  const pratique = (date: string, selection: string, row?: any) => {
    if (daySlots.has(date)) {
      const parts = resolvePratiqueSlotParts(daySlots.get(date), normalizePratiqueType(row?.sessions?.type_session ?? filiere), normalizePratiqueCreneau(selection));
      ajouter(date, parts.filter(p => p.minutes > 0).map(p => p.creneau), true);
    } else if (row) {
      const keys = slotsSignatures(row.heure_debut_personnalisee ?? row.sessions.heure_debut, row.heure_fin_personnalisee ?? row.sessions.heure_fin).filter(k => k === 'matin' || k === 'apres_midi');
      const selected = normalizePratiqueCreneau(selection);
      ajouter(date, keys.filter(k => selected === 'journee' || k === (selected === 'matin' ? 'matin' : 'apres_midi')), true);
    } else incomplet = true;
  };
  for (const row of inscriptions) {
    if (!retenue(row)) continue;
    const s = row.sessions;
    if (/pratique/i.test(s.type_session ?? '')) {
      const date = dateISO(s.date_debut), rs = reservations.filter(r => dateISO(r.date_choisie) === date);
      if (rs.length) for (const r of rs) pratique(date, r.creneau, row);
      else pratique(date, 'journee', row);
      continue;
    }
    if (!/theorique/i.test(s.type_session ?? '') || row.elearning_apprenant === true) continue;
    const slots = creneauxSessionInscrite(row, filiere);
    if (!slots.length) incomplet = true;
    for (const slot of slots) ajouter(slot.date, [slot.creneau], false);
  }
  for (const r of reservations) {
    const date = dateISO(r.date_choisie);
    // Any assigned practical session owns eligibility for its date (including cancelled/excluded/waiting).
    if (inscriptions.some(row => /pratique/i.test(row.sessions?.type_session ?? '') && dateISO(row.sessions.date_debut) === date)) continue;
    pratique(date, r.creneau);
  }
  return { creneaux, incomplet };
}