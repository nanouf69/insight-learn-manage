// Barème centralisé — utilisé par TOUTES les vues (liste, résultats détaillés,
// bilan texte) pour garantir la MÊME note globale partout.
//
// Priorité de calcul d'une matière :
//   1. Si des réponses brutes sont disponibles (`details.reponses` en DB) → on
//      recalcule à partir du barème actuel via `getPointsParQuestion`.
//   2. Sinon on retombe sur le score stocké (`score_obtenu` / `score_max`).
//
// Cela évite toute divergence entre les 3 écrans quand le barème change.

import { getPointsParQuestion, type Matiere, type Question, type QuestionType } from "./examens-blancs-data";
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

// ===== SEUIL ÉLIMINATOIRE AFFICHÉ (texte uniquement) =====
// Affichage officiel : « Élim. < 6/20 » pour toutes les matières,
// « Élim. < 4/20 » pour l'Anglais. Le calcul utilise toujours la valeur
// enregistrée (noteEliminatoire) — cette fonction ne sert qu'au texte affiché.
export function getSeuilEliminatoireAffiche(nomMatiere?: string): number {
  return nomMatiere && /anglais/i.test(nomMatiere) ? 4 : 6;
}

// ===== SNAPSHOT D'UNE TENTATIVE (point 6) =====
// À la validation d'une matière, on fige la version EXACTE utilisée par
// l'apprenant (questions, choix proposés, bonnes réponses, barème, ordre).
// Toute relecture/recalcul ultérieur repart de ce snapshot : une correction
// faite plus tard dans l'Admin ne transforme JAMAIS une tentative passée.
// Les anciennes tentatives SANS snapshot conservent exactement le
// comportement existant — rien n'est reconstruit ni inventé.

export const MATIERE_SNAPSHOT_VERSION = 1;

export interface MatiereSnapshot {
  version: number;
  matiereId: string;
  nom?: string;
  noteSur?: number;
  coefficient?: number;
  noteEliminatoire?: number;
  ptsQCM?: number;
  ptsQRC?: number;
  createdAt?: string;
  questions?: Array<{
    id: number | string;
    type: QuestionType;
    enonce?: string;
    choix?: Array<{ lettre: string; texte?: string; correct?: boolean }>;
    reponseQRC?: string;
    reponses_possibles?: string[];
    points?: number;
    ordre?: number;
  }>;
}

/** Vrai si les `details` stockés contiennent un snapshot exploitable. */
export function hasMatiereSnapshot(details: any): boolean {
  const s = details?.snapshot;
  return Boolean(
    s &&
      typeof s === "object" &&
      Number(s.version) >= 1 &&
      Array.isArray(s.questions) &&
      s.questions.length > 0,
  );
}

/**
 * Reconstruit la matière TELLE QU'ELLE ÉTAIT au moment du passage, à partir du
 * snapshot figé. Retourne null si aucun snapshot n'est disponible.
 */
export function buildMatiereFromSnapshot(
  details: any,
  current?: Matiere | null,
): Matiere | null {
  if (!hasMatiereSnapshot(details)) return null;
  const s = details.snapshot as MatiereSnapshot;
  const questions = (s.questions ?? [])
    .filter((q) => q != null && q.type != null)
    .map((q, idx) => ({
      id: (typeof q.id === "number" ? q.id : Number(q.id)) as number,
      type: q.type,
      enonce: q.enonce ?? "",
      choix: Array.isArray(q.choix) ? (q.choix as any) : undefined,
      reponseQRC: q.reponseQRC,
      reponses_possibles: q.reponses_possibles,
      _ordre: q.ordre ?? idx,
    })) as unknown as Question[];

  return {
    id: s.matiereId ?? current?.id ?? "",
    nom: s.nom ?? current?.nom ?? "",
    duree: current?.duree ?? 0,
    coefficient: s.coefficient ?? current?.coefficient ?? 1,
    noteEliminatoire: s.noteEliminatoire ?? current?.noteEliminatoire ?? 0,
    noteSur: s.noteSur ?? current?.noteSur ?? 20,
    ptsQCM: s.ptsQCM ?? current?.ptsQCM,
    ptsQRC: s.ptsQRC ?? current?.ptsQRC,
    questions,
  };
}

/**
 * Résout la matière à utiliser pour NOTER une tentative :
 * - snapshot figé s'il existe (tentative déjà passée → passé intangible) ;
 * - sinon la matière courante (comportement historique inchangé).
 */
export function resolveMatiereForScoring(
  current: Matiere,
  details?: any,
): Matiere {
  return buildMatiereFromSnapshot(details, current) ?? current;
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
 * Calcule le score d'une matière en FUSIONNANT intelligemment deux sources :
 * - les questions ACTUELLES (`matiere`), qui reflètent vos corrections/éditions —
 *   toujours prioritaires quand une question y est présente,
 * - complétées par les questions de la version D'ORIGINE (`staticFallbackMatiere`)
 *   UNIQUEMENT pour les questions auxquelles l'élève a répondu mais qui ont
 *   depuis disparu de la version actuelle (ex : question supprimée après coup).
 *
 * Ça évite le piège d'un repli "tout ou rien" : une correction que vous avez
 * faite sur une question qui existe encore ne doit JAMAIS être perdue au
 * profit de l'ancienne version, même si une AUTRE question de la même
 * matière a été supprimée entre-temps.
 *
 * En dernier recours seulement (aucune réponse brute exploitable), on
 * retombe sur le score stocké (`storedScoreObtenu` / `storedScoreMax`).
 */
export function computeMatiereScore(
  matiere: Matiere,
  reponses: Record<string, any> | null | undefined,
  storedScoreObtenu?: unknown,
  storedScoreMax?: unknown,
  correctionsIA?: CorrectionCache | null,
  staticFallbackMatiere?: Matiere | null,
): MatiereScore | null {
  // 1) Try the current (live-edited) question set first, as-is.
  const fromReponses = computeMatiereScoreFromReponses(matiere, reponses, correctionsIA);
  if (fromReponses) return fromReponses;

  // 2) If that failed (low coverage — some answered questions are missing
  // from the current set), build a MERGED question set: current questions
  // win by id (preserving your edits), plus any original questions the
  // student answered that are no longer present currently.
  if (staticFallbackMatiere && reponses) {
    const currentIds = new Set((matiere.questions ?? []).map((q) => q?.id));
    const missingAnsweredStaticQuestions = (staticFallbackMatiere.questions ?? []).filter((q) => {
      if (q == null || currentIds.has(q.id)) return false;
      const rep = reponses[q.id] ?? reponses[String(q.id)];
      if (rep === undefined || rep === null) return false;
      if (Array.isArray(rep)) return rep.length > 0;
      if (typeof rep === "string") return rep.trim() !== "";
      return true;
    });
    if (missingAnsweredStaticQuestions.length > 0) {
      const mergedMatiere: Matiere = {
        ...matiere,
        questions: [...(matiere.questions ?? []), ...missingAnsweredStaticQuestions],
      };
      const fromMerged = computeMatiereScoreFromReponses(mergedMatiere, reponses, correctionsIA);
      if (fromMerged) return fromMerged;
    }
    // Last-resort whole-fallback (e.g. current set is entirely mismatched —
    // question ids were fully reshuffled, not just one deletion).
    const fromOriginal = computeMatiereScoreFromReponses(staticFallbackMatiere, reponses, correctionsIA);
    if (fromOriginal) return fromOriginal;
  }

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

/**
 * NOTE D'UNE TENTATIVE DÉJÀ PASSÉE — RÈGLE DÉFINITIVE.
 *
 * - Tentative AVEC snapshot : on note à partir du snapshot figé (version exacte
 *   vue par l'apprenant).
 * - Tentative SANS snapshot (toutes les tentatives antérieures aux snapshots) :
 *   la note ENREGISTRÉE en base est définitive. On ne recalcule JAMAIS à partir
 *   des questions actuelles, donc modifier, ajouter ou supprimer une question
 *   ne peut plus changer une ancienne note.
 *
 * Lecture seule : aucune donnée apprenant n'est modifiée.
 */
export function computeMatiereScoreForAttempt(
  matiereCourante: Matiere,
  row: { details?: any; score_obtenu?: unknown; score_max?: unknown; note_sur_20?: unknown } | null | undefined,
  staticFallbackMatiere?: Matiere | null,
): MatiereScore | null {
  if (!row) return null;
  const details = (row as any).details;

  if (hasMatiereSnapshot(details)) {
    return computeMatiereScore(
      resolveMatiereForScoring(matiereCourante, details),
      details?.reponses || null,
      (row as any).score_obtenu,
      (row as any).score_max,
      details?.correctionsIA || null,
      staticFallbackMatiere ?? null,
    );
  }

  // Aucune snapshot → note figée telle qu'enregistrée.
  const storedObtenu = toFiniteNumber((row as any).score_obtenu, NaN);
  const storedMax = toFiniteNumber((row as any).score_max, NaN);
  const storedNote20 = toFiniteNumber((row as any).note_sur_20, NaN);

  if (!Number.isFinite(storedObtenu) || !Number.isFinite(storedMax) || storedMax <= 0) {
    if (!Number.isFinite(storedNote20)) return null;
    const note = clamp(storedNote20, 0, 20);
    return {
      scoreObtenu: note,
      scoreMax: 20,
      noteSur20: note,
      admis: computeAdmisForMatiere(note, 20, matiereCourante.noteEliminatoire, matiereCourante.noteSur || 20, false),
      passee: true,
    };
  }

  const safeScore = clamp(storedObtenu, 0, storedMax);
  const noteSur20 = Number.isFinite(storedNote20)
    ? clamp(storedNote20, 0, 20)
    : normalizeNoteSur20(safeScore, storedMax);
  return {
    scoreObtenu: safeScore,
    scoreMax: storedMax,
    noteSur20,
    admis: computeAdmisForMatiere(safeScore, storedMax, matiereCourante.noteEliminatoire, matiereCourante.noteSur || 20, false),
    passee: true,
  };
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
