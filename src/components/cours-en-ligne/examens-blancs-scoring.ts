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
import type { ExamenBlanc } from "./examens-blancs-types";
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
      const correction = evaluateQrcDeterministic(q, rep, pts);
      return total + correction.pointsObtenus;
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
): MatiereScore | null {
  const fromReponses = computeMatiereScoreFromReponses(matiere, reponses);
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
