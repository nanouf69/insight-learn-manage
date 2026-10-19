import { clampConnexionsToAccessEnd } from "@/lib/reports/session-duration";
import { retirerCreneauxPratique } from "@/lib/reports/exclusionPratique";
import { learningSessionWindow, getLearningHoursStartMs } from "@/lib/reports/learning-hours-window";

/** Shared unchanged evidence arithmetic; no database writes or rate calculation. */
export function elearningHoursEvidence({ apprenantId, apprenant, acts, quizzes, exos, cnxAll, pratiqueDates }: {
  apprenantId: string; apprenant: any; acts: any[]; quizzes: any[]; exos: any[]; cnxAll: any[]; pratiqueDates: string[];
}) {
// Jours de pratique : 9h-12h / 13h-16h = formation pratique, pas d'e-learning.
const cnxRows = retirerCreneauxPratique(
  clampConnexionsToAccessEnd(
    cnxAll as any[],
    apprenant?.date_fin_cours_en_ligne || apprenant?.date_fin_formation,
  ),
  pratiqueDates,
);

// ---- E-learning (identique au Rapport d'activite / releve)
const isAccueil = (nom?: string | null) => !!nom && /accueil|liste\s+des\s+modules/i.test(nom);
const pedagogicalActTs = [
  ...acts
    .filter((a: any) =>
      (a.action_type === "open_module" || a.action_type === "open_section" || a.action_type === "open_cours") &&
      !isAccueil(a.module_nom))
    .map((a: any) => Date.parse(a.occurred_at)),
  ...exos.map((e: any) => Date.parse(e.updated_at)),
  ...quizzes.map((q: any) => Date.parse(q.completed_at)),
].filter((t: number) => !Number.isNaN(t) && t >= (getLearningHoursStartMs(apprenantId) ?? -Infinity)).sort((a: number, b: number) => a - b);

const hasActivityInWindow = (start: number, end: number): boolean => {
  let lo = 0, hi = pedagogicalActTs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = pedagogicalActTs[mid];
    if (v < start) lo = mid + 1;
    else if (v > end) hi = mid - 1;
    else return true;
  }
  return false;
};

// Début = uniquement l'ouverture d'un module ou la réalisation d'un
// exercice/quiz. Une simple connexion ou un émargement ne compte pas.
const isPedagogicalModule = (nom?: string | null) =>
  !!nom && !isAccueil(nom) && !/^syst[eè]me$/i.test(nom.trim());
const firstPedagogicalConnectionStart = (cnxRows as any[])
  .map((c: any) => {
    const { start, end, minutes } = learningSessionWindow(c, apprenantId);
    if (Number.isNaN(start)) return null;
    if (getLearningHoursStartMs(apprenantId) !== null && minutes <= 0) return null;
    const qualifies = isPedagogicalModule(c.current_module) || hasActivityInWindow(start, end);
    return qualifies ? start : null;
  })
  .filter((value: number | null): value is number => value !== null)
  .sort((a: number, b: number) => a - b)[0];
const firstActualActivityStart = firstPedagogicalConnectionStart !== undefined
  ? firstPedagogicalConnectionStart
  : pedagogicalActTs[0];


let onlineMin = 0;
for (const c of cnxRows as any[]) {
  const s = c.started_at;
  const e = c.ended_at || c.last_seen_at;
  if (!s || !e) continue;
  const { start: startMs, end: endMs } = learningSessionWindow(c, apprenantId);
  if (!isFinite(startMs)) continue;
  const ms = endMs - startMs;
  if (ms <= 0) continue;
  if (!hasActivityInWindow(startMs, endMs)) continue;
  onlineMin += Math.floor(ms / 60000);
}

  return { onlineMin, pedagogicalActTs, firstActualActivityStart };
}
