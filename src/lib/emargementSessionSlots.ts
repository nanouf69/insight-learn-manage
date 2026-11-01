import { parseClockMinutes } from '@/lib/pratiqueSlots';

/** Enrollment theory schedule. Agenda and curriculum quotas never create rights. */
export function creneauxSessionInscrite(row: any, filiere: string) {
  const s = row.sessions;
  if (!s || row.liste_attente === true || row.emargements_exclus === true || row.elearning_apprenant === true
    || /annul|abandon|exclu|attente/i.test(`${s.statut ?? ''} ${row.statut_suivi ?? ''}`)
    || !/theorique/i.test(s.type_session ?? '')) return [];
  const iso = (v: unknown) => String(v ?? '').slice(0, 10);
  const debut = [iso(s.date_debut), iso(row.date_debut)].filter(Boolean).sort().at(-1) ?? '';
  const fin = [iso(s.date_fin || s.date_debut), iso(row.date_fin_personnalisee || row.date_fin)].filter(Boolean).sort()[0] ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin) || fin < debut) return [];
  const soir = /soir|17/.test(`${s.nom ?? ''} ${(s.creneaux ?? []).join(' ')}`);
  const hd = parseClockMinutes(row.heure_debut_personnalisee || s.heure_debut || (soir ? '17:00' : '09:00'));
  const hf = parseClockMinutes(row.heure_fin_personnalisee || s.heure_fin || (soir ? '21:00' : '16:00'));
  if (hd == null || hf == null || hf <= hd) return [];
  const fc = /continue|\bfc\b|fco/i.test(`${row.type_apprenant ?? ''} ${row.formation_choisie ?? ''} ${s.nom ?? ''}`);
  const ranges: [string, number, number][] = hd >= 1020
    ? [['soir_1', 1020, 1110], ['soir_2', 1110, 1260]]
    : [['matin', 540, 720], ['apres_midi', 780, fc ? 1020 : 960]];
  const clock = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  const out: { date: string; creneau: string; debut: string; fin: string }[] = [];
  const d = new Date(`${debut}T00:00:00Z`); let jours = 0;
  for (let i = 0; i < 400 && Number.isFinite(d.getTime()) && iso(d.toISOString()) <= fin; i++, d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    if (++jours > 5 && filiere.toUpperCase() === 'TA' && !row.date_fin_personnalisee) break;
    for (const [creneau, a, z] of ranges) {
      const start = Math.max(hd, a), end = Math.min(hf, z);
      if (end > start) out.push({ date: iso(d.toISOString()), creneau, debut: clock(start), fin: clock(end) });
    }
  }
  return out;
}