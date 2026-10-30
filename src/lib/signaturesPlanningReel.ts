import { daySlotsDepuisConfigs, normalizePratiqueCreneau, normalizePratiqueType, parseClockMinutes, resolvePratiqueSlotParts } from '@/lib/pratiqueSlots';

const dateISO = (v: unknown) => String(v ?? '').slice(0, 10);
const dateValide = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const retenue = (r: any) => r?.sessions && r.liste_attente !== true && r.emargements_exclus !== true && !/annul/i.test(r.sessions.statut ?? '');

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
    const debut = [dateISO(s.date_debut), dateISO(row.date_debut)].filter(Boolean).sort().at(-1) ?? '';
    let fin = [dateISO(s.date_fin || s.date_debut), dateISO(row.date_fin_personnalisee || row.date_fin)].filter(Boolean).sort()[0] ?? '';
    if (!dateValide(debut) || !dateValide(fin) || fin < debut) { incomplet = true; continue; }
    if (filiere.toUpperCase() === 'TA' && !dateValide(dateISO(row.date_fin_personnalisee))) {
      const d = new Date(`${debut}T00:00:00Z`); let jours = 0;
      for (let i = 0; i < 400 && d.toISOString().slice(0, 10) <= fin; i++, d.setUTCDate(d.getUTCDate() + 1)) {
        if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && ++jours === 5) { fin = d.toISOString().slice(0, 10); break; }
      }
    }
    const hd = parseClockMinutes(row.heure_debut_personnalisee ?? s.heure_debut);
    const hf = parseClockMinutes(row.heure_fin_personnalisee ?? s.heure_fin);
    let trouves = 0;
    for (const b of blocs) {
      const publics = Array.isArray(b.publics_cibles) ? b.publics_cibles : [];
      if (!(publics.length ? publics.some((p: string) => p.toUpperCase() === filiere.toUpperCase()) : new RegExp(`\\b${filiere}\\b`, 'i').test(b.formation ?? ''))) continue;
      const d = new Date(`${dateISO(b.semaine_debut)}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + Number(b.jour));
      if (!Number.isFinite(d.getTime()) || d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
      const date = d.toISOString().slice(0, 10);
      if (date < debut || date > fin) continue;
      const a = parseClockMinutes(b.heure_debut), z = parseClockMinutes(b.heure_fin);
      if (a == null || z == null) { incomplet = true; continue; }
      const start = Math.max(a, hd ?? a), end = Math.min(z, hf ?? z);
      if (end <= start) continue;
      const clock = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
      ajouter(date, slotsSignatures(clock(start), clock(end)), false); trouves++;
    }
    // Only explicitly assigned hours are a fallback schedule, never a 9–16 default.
    if (!trouves) {
      const keys = slotsSignatures(row.heure_debut_personnalisee ?? s.heure_debut, row.heure_fin_personnalisee ?? s.heure_fin);
      if (!keys.length) { incomplet = true; continue; }
      const d = new Date(`${debut}T00:00:00Z`);
      for (let i = 0; i < 400 && d.toISOString().slice(0, 10) <= fin; i++, d.setUTCDate(d.getUTCDate() + 1)) {
        if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) ajouter(d.toISOString().slice(0, 10), keys, false);
      }
    }
  }
  for (const r of reservations) {
    const date = dateISO(r.date_choisie);
    // Any assigned practical session owns eligibility for its date (including cancelled/excluded/waiting).
    if (inscriptions.some(row => /pratique/i.test(row.sessions?.type_session ?? '') && dateISO(row.sessions.date_debut) === date)) continue;
    pratique(date, r.creneau);
  }
  return { creneaux, incomplet };
}