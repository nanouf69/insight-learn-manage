// Barème centralisé — utilisé par TOUTES les vues (liste, résultats détaillés,
// bilan texte) pour garantir la MÊME note globale partout.
//
// Priorité de calcul d'une matière :
//   1. Si des réponses brutes sont disponibles (`details.reponses` en DB) → on
//      recalcule à partir du barème actuel via `getPointsParQuestion`.
//   2. Sinon on retombe sur le score stocké (`score_obtenu` / `score_max`).
//
// Cela évite toute divergence entre les 3 écrans quand le barème change.

import { getPointsParQuestion, type Matiere, type Question } from "./examens-blancs-data";
import type { CorrectionCache, ExamenBlanc, ResultatMatiere } from "./examens-blancs-types";
import {
  safeArray,
  toFiniteNumber,
  clamp,
  normalizeNoteSur20,
  computeAdmisForMatiere,
  evaluateQrcDeterministic,
  getCorrectQcmChoices,
  normalizeSelectedChoices,
} from "./examens-blancs-utils";

export interface MatiereScore {
  scoreObtenu: number;
  scoreMax: number;
  noteSur20: number;
  admis: boolean;
  passee: boolean;
}

/** Calcule le score d'une matière à partir des réponses brutes (nouveau barème). */
export function computeMatiereScoreFromReponses(
  matiere: Matiere,
  reponses: Record<string, any> | null | undefined,
  correctionsIA?: CorrectionCache | null,
): MatiereScore | null {
  if (!reponses || Object.keys(reponses).length === 0) return null;

  const questionsSafe = (matiere.questions ?? []).filter(
    (q): q is Question => q != null && q?.type != null,
  );
  if (questionsSafe.length === 0) return null;

  const scoreMax = questionsSafe.reduce(
    (acc, q) => acc + getPointsParQuestion(matiere.id, q.type, matiere),
    0,
  );

  // SAFETY NET: if a question was deleted/changed after a student answered,
  // their stored `reponses` may no longer line up with the CURRENT question
  // set (different ids). Recomputing against a mismatched set can crash a
  // real, correct grade down to near-zero — worse than just showing the
  // original stored score. Detect that case and refuse to recompute.
  const matchedCount = questionsSafe.filter((q) => {
    const rep = reponses[q.id] ?? reponses[String(q.id)];
    if (rep === undefined || rep === null) return false;
    if (Array.isArray(rep)) return rep.length > 0;
    if (typeof rep === "string") return rep.trim() !== "";
    return true;
  }).length;
  const coverage = questionsSafe.length > 0 ? matchedCount / questionsSafe.length : 0;
  if (coverage < 0.5) {
    // Too few of the current questions have a matching stored answer —
    // the question set has likely changed since this attempt. Bail out
    // so the caller falls back to the originally stored score/max instead.
    return null;
  }

  const scoreObtenu = questionsSafe.reduce((total, q) => {
    const rep = reponses[q.id] ?? reponses[String(q.id)];
    const pts = getPointsParQuestion(matiere.id, q.type, matiere);
    if (q.type === "QCM") {
      const correctes = safeArray<string>(getCorrectQcmChoices(q)).sort();
      const donnees = safeArray<string>(normalizeSelectedChoices(rep)).sort();
      if (
        correctes.length > 0 &&
        JSON.stringify(correctes) === JSON.stringify(donnees)
      ) {
        return total + pts;
      }
      return total;
    }
    if (q.type === "QRC") {
      const storedCorrection = correctionsIA?.[q.id] ?? correctionsIA?.[String(q.id) as any];
      if (storedCorrection && storedCorrection !== "loading" && storedCorrection !== "error") {
        return total + clamp(storedCorrection.pointsObtenus, 0, pts);
      }
      const deterministicCorrection = evaluateQrcDeterministic(q, rep, pts);
      return total + deterministicCorrection.pointsObtenus;
    }
    return total;
  }, 0);

  const safeScore = scoreMax > 0 ? clamp(scoreObtenu, 0, scoreMax) : Math.max(scoreObtenu, 0);
  const noteSur20 = normalizeNoteSur20(safeScore, scoreMax);
  const admis = computeAdmisForMatiere(
    safeScore,
    scoreMax,
    matiere.noteEliminatoire,
    matiere.noteSur || 20,
    false,
  );

  return { scoreObtenu: safeScore, scoreMax, noteSur20, admis, passee: true };
}

/**
 * Calcule le score d'une matière avec fallback :
 * 1) réponses brutes (`reponses`) via le barème actuel,
 * 2) sinon score stocké (`storedScoreObtenu` / `storedScoreMax`).
 */
export function computeMatiereScore(
  matiere: Matiere,
  reponses: Record<string, any> | null | undefined,
  storedScoreObtenu?: unknown,
  storedScoreMax?: unknown,
  correctionsIA?: CorrectionCache | null,
): MatiereScore | null {
  const fromReponses = computeMatiereScoreFromReponses(matiere, reponses, correctionsIA);
  if (fromReponses) return fromReponses;

  const storedObtenu = toFiniteNumber(storedScoreObtenu, NaN);
  const storedMax = toFiniteNumber(storedScoreMax, NaN);
  if (!Number.isFinite(storedObtenu) || !Number.isFinite(storedMax) || storedMax <= 0) {
    return null;
  }

  const safeScore = clamp(storedObtenu, 0, storedMax);
  const noteSur20 = normalizeNoteSur20(safeScore, storedMax);
  const admis = computeAdmisForMatiere(
    safeScore,
    storedMax,
    matiere.noteEliminatoire,
    matiere.noteSur || 20,
    false,
  );
  return { scoreObtenu: safeScore, scoreMax: storedMax, noteSur20, admis, passee: true };
}

export function computeResultatMatiereScore(
  matiere: Matiere,
  resultat: Pick<ResultatMatiere, "reponses" | "noteObtenue" | "maxPoints" | "correctionsIA"> | null | undefined,
  correctionsIA?: CorrectionCache | null,
): MatiereScore | null {
  if (!resultat) return null;
  return computeMatiereScore(
    matiere,
    resultat.reponses as Record<string, any> | null | undefined,
    resultat.noteObtenue,
    resultat.maxPoints,
    correctionsIA ?? resultat.correctionsIA ?? null,
  );
}

export interface MoyenneExamen {
  moyenne: number;
  totalCoef: number;
  matieresPassees: number;
  matieresTotal: number;
  eliminatoires: string[];
  hasScores: boolean;
  admisGlobal: boolean;
}

/**
 * Calcule la moyenne globale d'un examen selon la règle canonique :
 * - moyenne pondérée par coefficient, seulement sur les matières passées,
 * - admis global si moyenne >= 10 ET aucune éliminatoire ET toutes les matières passées.
 */
export function computeMoyenneExamen(
  examen: ExamenBlanc,
  resolveMatiereScore: (matiere: Matiere) => MatiereScore | null,
): MoyenneExamen {
  const matieres = examen.matieres.filter((m): m is Matiere => Boolean(m));
  let weightedSum = 0;
  let totalCoef = 0;
  let matieresPassees = 0;
  const eliminatoires: string[] = [];

  for (const m of matieres) {
    const score = resolveMatiereScore(m);
    if (!score) continue;
    const coef = m.coefficient || 1;
    weightedSum += score.noteSur20 * coef;
    totalCoef += coef;
    matieresPassees++;
    if (!score.admis) eliminatoires.push(m.nom.split(" - ")[0]);
  }

  const moyenne = totalCoef > 0 ? Math.round((weightedSum / totalCoef) * 10) / 10 : 0;
  const hasScores = matieresPassees > 0;
  const admisGlobal =
    hasScores &&
    moyenne >= 10 &&
    eliminatoires.length === 0 &&
    matieresPassees === matieres.length;

  return {
    moyenne,
    totalCoef,
    matieresPassees,
    matieresTotal: matieres.length,
    eliminatoires,
    hasScores,
    admisGlobal,
  };
}
