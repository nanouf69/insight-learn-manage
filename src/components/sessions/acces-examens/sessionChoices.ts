export interface AccessSession {
  id: string; nom: string | null; date_debut: string | null; date_fin: string | null;
  types_apprenant: string[] | null; type_session: string | null;
}
export interface ExamCatalogEntry { exam_id: string; module_id: number }
export const parisDay = (now: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(now);
const remote = /e[\s-]?learning|distanciel|en[\s-]ligne|online|(?:^|[\s-])(?:vtc|taxi|ta|va)[\s-]e$/i;
const tracksByModule: Record<number, string[]> = {
  35: ['vtc', 'taxi', 'vtc e présentiel', 'taxi e présentiel'],
  36: ['taxi', 'taxi e présentiel'], 37: ['ta', 'ta e présentiel'], 38: ['va', 'va e présentiel'],
};
/** Display restriction only: mirrors session_exam_catalog, never grants access. */
export function sessionChoices(sessions: AccessSession[], examId: string, catalog: ExamCatalogEntry[], now = new Date()) {
  const today = parisDay(now);
  const modules = catalog.filter(e => e.exam_id === examId).map(e => e.module_id);
  return sessions.filter(s => {
    if (!['theorique', 'theorique_pratique', 'vtc', 'vtc_soir', 'taxi'].includes(s.type_session ?? '')) return false;
    if (remote.test(s.nom ?? '') || remote.test(s.type_session ?? '') || (s.types_apprenant ?? []).some(t => remote.test(t))) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date_debut ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(s.date_fin ?? '')) return false;
    if (!s.date_debut || !s.date_fin || s.date_fin < s.date_debut || s.date_fin < today) return false;
    return modules.some(m => (s.types_apprenant ?? []).some(t => tracksByModule[m]?.includes(t.trim().toLowerCase())));
  }).map(s => ({ ...s, current: (s.date_debut ?? '') <= today && today <= (s.date_fin ?? '') }))
    .sort((a, b) => Number(b.current) - Number(a.current)
      || (a.date_debut ?? '').localeCompare(b.date_debut ?? '') || a.id.localeCompare(b.id));
}
export function sessionChoiceLabel(s: AccessSession & {current: boolean}) {
  const date = (value: string | null) => value?.split('-').reverse().join('/') ?? '—';
  return `${s.current ? 'En cours · ' : ''}${s.nom ?? 'Session sans nom'} · ${date(s.date_debut)} — ${date(s.date_fin)}`;
}
/** One-shot local-day boundary, not periodic polling or a server refresh. */
export function nextParisDayDelay(now: Date): number {
  const day = parisDay(now);
  let lo = now.getTime(), hi = lo + 26 * 3600_000;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (parisDay(new Date(mid)) === day) lo = mid; else hi = mid;
  }
  return hi - now.getTime() + 1;
}