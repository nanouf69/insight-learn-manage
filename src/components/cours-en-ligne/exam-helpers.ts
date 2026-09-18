/**
 * Extracted helper functions from exam components.
 * These are the REAL functions used by CorrectionQRCTab, ExamensBlancsPage,
 * ExamensBlancsEditor, and ExamenBlancsPassage.
 *
 * Extracting them here makes them testable and ensures
 * the components use the same logic (single source of truth).
 */
import type { ExamenBlanc, Matiere, Question } from "./examens-blancs-data";
import { computeAdmisForMatiere } from "./examens-blancs-utils";

// ─── From CorrectionQRCTab.tsx:167-172 ───────────────────────────────────

/**
 * Build a map of exam ID → ExamenBlanc from source + saved.
 * loadSavedExamens already does a proper merge (source + DB overrides),
 * so we just use its result and fall back to source if not found.
 */
export function buildExamenMap(
  sourceExamens: ExamenBlanc[],
  savedExamens: ExamenBlanc[],
): Record<string, ExamenBlanc> {
  const map: Record<string, ExamenBlanc> = {};
  for (const e of sourceExamens) {
    const s = savedExamens.find((saved) => saved.id === e.id);
    map[e.id] = s || e;
  }
  return map;
}

// ─── From CorrectionQRCTab.tsx: matiere lookup with fallback ─────────────

/**
 * Find a matiere for a given quiz result row.
 * 1. Try examenMap first (merged data)
 * 2. Fall back to tousLesExamens for the same quiz_id
 * 3. Fall back to any exam that has a matiere with matching id AND questions
 */
export function findMatiereWithFallback(
  examenMap: Record<string, ExamenBlanc>,
  tousLesExamens: ExamenBlanc[],
  quizId: string,
  matiereId: string,
): Matiere | undefined {
  // 1. Try examenMap
  const matiere = examenMap[quizId]?.matieres?.find((m: Matiere) => m.id === matiereId);
  if (matiere) return matiere;
  if (!matiereId) return undefined;

  // 2. Try same quiz in source data
  for (const srcExam of tousLesExamens) {
    if (srcExam.id === quizId) {
      const found = srcExam.matieres.find((m: Matiere) => m.id === matiereId);
      if (found) return found;
    }
  }

  // 3. Try any exam that has this matiere WITH questions (avoid empty matches)
  for (const srcExam of tousLesExamens) {
    const found = srcExam.matieres.find((m: Matiere) => m.id === matiereId);
    if (found?.questions?.length) return found;
  }

  return undefined;
}

// ─── From CorrectionQRCTab.tsx: reconstruct questions from source ────────

/**
 * Get source questions for a matiere, falling back to tousLesExamens
 * when the matiere's own questions array is empty.
 */
export function getSourceQuestions(
  matiere: Matiere,
  tousLesExamens: ExamenBlanc[],
): any[] {
  if (matiere.questions?.length) return matiere.questions;
  if (!matiere.id) return [];
  for (const srcExam of tousLesExamens) {
    const srcMat = srcExam.matieres.find((m: Matiere) => m.id === matiere.id);
    if (srcMat?.questions?.length) return srcMat.questions;
  }
  return [];
}

// ─── From CorrectionQRCTab.tsx:219 ───────────────────────────────────────

/**
 * Check if a result row should be skipped in QRC processing.
 * FIX: only skip when details itself is null/undefined.
 */
export function shouldSkipResultRow(details: any): boolean {
  if (details == null) return true;
  return false;
}

// ─── From ExamensBlancsPage.tsx:681-695 ──────────────────────────────────

/**
 * Build question details for saving to apprenant_quiz_results.
 * FIX: falls back to source when matiere.questions is empty,
 * and tries both numeric and string keys for reponses.
 */
export function buildQuestionDetails(
  matiere: Matiere,
  reponses: Record<string | number, any>,
  tousLesExamens: ExamenBlanc[],
): Array<{ questionId: number; enonce: string; type: string; reponseEleve: any; reponseCorrecte: any }> {
  let rawQuestions = matiere?.questions || [];
  // FIX: fallback to source when questions are empty
  if (rawQuestions.length === 0 && matiere?.id) {
    for (const exam of tousLesExamens) {
      const srcMat = exam.matieres.find(m => m.id === matiere.id);
      if (srcMat?.questions?.length) { rawQuestions = srcMat.questions; break; }
    }
  }
  const questionsSafe = rawQuestions.filter(q => q != null);
  return questionsSafe.map((q: Question) => {
    if (!q) return null;
    // FIX: try both numeric and string keys (JSON round-trip makes keys strings)
    const rep = reponses?.[q.id] ?? reponses?.[String(q.id)];
    return {
      questionId: q.id, enonce: q.enonce || "", type: q?.type || "QCM",
      reponseEleve: rep ?? null,
      reponseCorrecte: q?.type === "QCM" && q.choix
        ? q.choix.filter(c => c.correct).map(c => c.lettre)
        : (q.reponseQRC || (q.reponses_possibles || []).join(" / ")),
    };
  }).filter(Boolean) as any[];
}

// ─── From ExamenBlancsPassage.tsx:214 & ExamensBlancsPage.tsx:738 ────────

/**
 * Build the exercice_id key for reponses_apprenants.
 * FIX: both auto-save and flush use the same double underscore `__`.
 */
export function buildExerciceKeyAutoSave(examenId: string, matiereId: string): string {
  return `${examenId || "exam"}__${matiereId}`;
}

export function buildExerciceKeyFlush(examenId: string, matiereId: string): string {
  return `${examenId}__${matiereId}`;
}

// ─── From ExamensBlancsPage.tsx:109-110 ──────────────────────────────────

/**
 * Check if examenChoisi should be protected from replacement.
 * FIX: also protects "resultats" phase.
 */
export function isExamPhaseProtected(phase: string): boolean {
  return phase === "examen" || phase === "transition" || phase === "resultats";
}

// ─── From ExamensBlancsEditor.tsx:261 ────────────────────────────────────

const normalizeQuestionType = (value: unknown) => String(value ?? "").trim().toUpperCase();
const normalizeQuestionText = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Build a merge key for question matching during loadSavedExamens.
 * FIX: includes enonce to prevent cross-exam collisions.
 */
export function getQuestionKey(value: any): string {
  const id = Number(value?.id);
  const type = normalizeQuestionType(value?.type);
  const enonce = normalizeQuestionText(value?.enonce);
  if (enonce) return `${id}::${type}::${enonce}`;
  return `${id}::${type}`;
}

// ─── QRC : attente de correction manuelle ────────────────────────────────

/**
 * Une matière contenant des QRC reste « En attente de correction » tant que
 * l'administrateur n'a pas validé chaque QRC.
 *
 * IMPORTANT : le drapeau `qrc_pending_correction` n'est posé QUE sur les
 * nouveaux résultats. Les anciens résultats (sans ce drapeau) gardent
 * exactement leur affichage actuel : aucune donnée existante n'est modifiée.
 */
export function isQrcCorrectionValidated(correction: any): boolean {
  if (!correction || typeof correction !== "object") return false;
  if (correction.validatedByAdmin === true) return true;
  const explication = String(correction.explication ?? "").toLowerCase();
  const legacyAdminMarker =
    explication.includes("correction manuelle par l'administrateur") ||
    explication.includes("validation manuelle (masqué par admin)");
  return correction.manuel === true && !!correction.correctedAt && legacyAdminMarker;
}

/** Fenêtre technique : deux écritures du même passage (doublons techniques). */
export const MEME_PASSAGE_MS = 5 * 60 * 1000;

function isBlankAnswer(value: unknown): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0 || value.every((v) => String(v ?? "").trim() === "");
  return String(value).trim() === "";
}

function getSnapshotQuestions(details: any): any[] | null {
  if (Array.isArray(details?.questions) && details.questions.length) return details.questions;
  if (Array.isArray(details?.snapshot?.questions) && details.snapshot.questions.length) return details.snapshot.questions;
  return null;
}

/**
 * QRC RÉELLEMENT LAISSÉE VIDE PAR L'ÉLÈVE.
 *
 * Certitude exigée : la tentative a bien été finalisée (snapshot des questions
 * présent), l'entrée de la question existe dans ce snapshot, elle porte
 * explicitement une réponse vide, et aucune réponse n'existe non plus dans les
 * réponses enregistrées. Dans ce cas seulement : 0 point d'office, la matière
 * n'est pas bloquée et la QRC ne remonte pas dans la file de correction.
 * Une réponse perdue (aucune trace de réponse dans le snapshot) reste bloquante.
 */
export function isQrcAnswerCertainlyEmpty(details: any, questionId: unknown): boolean {
  const snap = getSnapshotQuestions(details);
  if (!snap) return false;
  const entry = snap.find((q: any) => String(q?.questionId ?? q?.id) === String(questionId));
  if (!entry || typeof entry !== "object") return false;
  if (!("reponseEleve" in entry)) return false;
  if (!isBlankAnswer((entry as any).reponseEleve)) return false;
  const reponses = details?.reponses ?? details?.snapshot?.reponses;
  if (reponses && typeof reponses === "object") {
    const v = (reponses as any)[questionId as any] ?? (reponses as any)[String(questionId)];
    if (!isBlankAnswer(v)) return false;
  }
  return true;
}

export function isQrcPendingCorrection(details: any): boolean {
  if (!details || details.qrc_pending_correction !== true) return false;
  const questions = Array.isArray(details.questions) ? details.questions : [];
  const qrcIds = questions
    .filter((q: any) => normalizeQuestionType(q?.type) === "QRC")
    .map((q: any) => String(q?.questionId ?? q?.id))
    .filter((id: string) => !isQrcAnswerCertainlyEmpty(details, id));
  if (qrcIds.length === 0) return false;
  const corrections = details.correctionsIA || {};
  return qrcIds.some((id: string) => !isQrcCorrectionValidated(corrections?.[id] ?? corrections?.[`Q${id}`]));
}

/**
 * RÈGLE GÉNÉRALE (toutes filières, tous examens blancs, toutes tentatives) :
 * tant qu'une QRC RÉPONDUE d'une matière n'a pas été validée manuellement par
 * le formateur, aucune note définitive de cette matière ne peut être publiée.
 * Une QRC réellement laissée vide vaut 0 et ne bloque pas.
 * Lecture seule : ne modifie aucune réponse, note ou correction.
 */
export function isMatiereQrcPending(matiere: any, corrections: any, details?: any): boolean {
  const questions = Array.isArray(matiere?.questions) ? matiere.questions : [];
  const qrc = questions
    .filter((q: any) => q && normalizeQuestionType(q?.type) === "QRC")
    .filter((q: any) => !isQrcAnswerCertainlyEmpty(details, q?.id));
  if (qrc.length === 0) return false;
  const corr = corrections || {};
  const pendingByIds = qrc.some((q: any) => {
    const id = q?.id;
    const c = corr?.[id] ?? corr?.[String(id)] ?? corr?.[`Q${id}`];
    return !isQrcCorrectionValidated(c);
  });
  if (!pendingByIds) return false;
  // Repli : la numérotation enregistrée lors de la tentative peut différer de la
  // numérotation actuelle des questions. Si l'administrateur a validé au moins
  // autant de QRC que la matière en contient, la correction est terminée.
  const validatedCount = Object.values(corr).filter((c: any) => isQrcCorrectionValidated(c)).length;
  return validatedCount < qrc.length;
}

/**
 * IDENTITÉ STABLE DES QRC D'UNE TENTATIVE DÉJÀ PASSÉE.
 *
 * Une QRC déjà passée est identifiée par le snapshot de la tentative
 * (details.questions / details.snapshot.questions), jamais par la position
 * actuelle des questions dans Gestion. Ajouter, supprimer, déplacer ou
 * renuméroter une question plus tard n'a donc aucun effet sur la tentative
 * ni sur la reconnaissance des corrections déjà validées.
 * Lecture seule : aucune donnée n'est modifiée ni reconstruite.
 */
export function getAttemptQrcQuestionIds(matiere: any, details: any): number[] | null {
  const snap = getSnapshotQuestions(details);
  if (!snap) return null;
  const ids = snap
    .filter((q: any) => {
      const type = q?.type
        ? normalizeQuestionType(q.type)
        : (/\(qrc\)/i.test(String(q?.enonce ?? "")) ? "QRC" : "QCM");
      if (type !== "QRC") return false;
      const qMat = q?.matiereId != null ? String(q.matiereId) : "";
      return !qMat || !matiere?.id || qMat === String(matiere.id);
    })
    .map((q: any) => Number(q?.questionId ?? q?.id))
    .filter((v: number) => Number.isFinite(v));
  return ids.length ? Array.from(new Set<number>(ids)) : null;
}

/**
 * Variante « tentative » de isMatiereQrcPending : privilégie l'identité
 * enregistrée dans le snapshot, puis retombe sur la définition actuelle.
 */
export function isMatiereQrcPendingForAttempt(matiere: any, details: any): boolean {
  const corr = details?.correctionsIA || details?.snapshot?.correctionsIA || {};
  const snapIds = getAttemptQrcQuestionIds(matiere, details);
  if (snapIds) {
    return snapIds
      .filter((id) => !isQrcAnswerCertainlyEmpty(details, id))
      .some((id) => !isQrcCorrectionValidated(corr?.[id] ?? corr?.[String(id)] ?? corr?.[`Q${id}`]));
  }
  return isMatiereQrcPending(matiere, corr, details);
}

/**
 * DOUBLES ÉCRITURES TECHNIQUES D'UN MÊME PASSAGE.
 *
 * L'application écrit parfois plusieurs lignes de résultat pour le même
 * passage à quelques secondes d'intervalle. La validation manuelle du
 * formateur n'est enregistrée que sur l'une d'elles : les autres gardent
 * l'ancienne correction automatique et bloquent la note à tort.
 *
 * Cette fonction ne modifie AUCUNE donnée en base : elle fusionne en mémoire
 * les corrections et les réponses des lignes d'un même passage
 * (apprenant + examen + matière + fenêtre technique), en retenant toujours la
 * validation manuelle existante — points et commentaires inchangés.
 * Deux passages réellement distincts restent séparés.
 */
export function mergePassageSiblingRows<T extends Record<string, any>>(rows: T[] | null | undefined): T[] {
  const list = (rows as any[]) || [];
  if (list.length === 0) return [];
  const asc = [...list].sort(
    (a, b) => (new Date(a?.completed_at).getTime() || 0) - (new Date(b?.completed_at).getTime() || 0),
  );
  type Group = { rows: any[]; corrections: Record<string, any>; reponses: Record<string, any>; lastTime: number };
  const byMatiere = new Map<string, Group[]>();

  for (const r of asc) {
    const key = `${r?.apprenant_id ?? ""}__${r?.quiz_id ?? ""}__${r?.matiere_id ?? ""}`;
    const time = new Date(r?.completed_at).getTime() || 0;
    const groups = byMatiere.get(key) || [];
    const last = groups[groups.length - 1];
    const details = r?.details || {};
    const target = last && time - last.lastTime <= MEME_PASSAGE_MS
      ? last
      : (() => {
          const g: Group = { rows: [], corrections: {}, reponses: {}, lastTime: time };
          groups.push(g);
          byMatiere.set(key, groups);
          return g;
        })();
    target.lastTime = time;
    target.rows.push(r);
    Object.entries(details.reponses || {}).forEach(([k, v]) => {
      if (isBlankAnswer(target.reponses[k]) && !isBlankAnswer(v)) target.reponses[k] = v;
    });
    Object.entries(details.correctionsIA || {}).forEach(([k, v]) => {
      const current = target.corrections[k];
      if (current == null || (!isQrcCorrectionValidated(current) && isQrcCorrectionValidated(v))) {
        target.corrections[k] = v;
      }
    });
  }

  const merged = new Map<any, { corrections: Record<string, any>; reponses: Record<string, any> }>();
  byMatiere.forEach((groups) => {
    groups.forEach((g) => {
      if (g.rows.length <= 1) return;
      g.rows.forEach((r) => merged.set(r, { corrections: g.corrections, reponses: g.reponses }));
    });
  });

  if (merged.size === 0) return list as T[];
  return list.map((r) => {
    const m = merged.get(r);
    if (!m) return r;
    const details = r?.details || {};
    return {
      ...r,
      details: {
        ...details,
        reponses: { ...(m.reponses || {}), ...(details.reponses || {}) },
        correctionsIA: { ...(details.correctionsIA || {}), ...m.corrections },
      },
    };
  }) as T[];
}





// ─── Statut réussi/échoué : une seule et même règle partout ───────────────

/**
 * Seuil éliminatoire de la matière, exprimé /20 (6/20 partout, 4/20 Anglais).
 * Priorité : matière courante → snapshot figé de la tentative → repli par nom.
 */
export function getNoteEliminatoireSur20(
  details: any,
  matiereNom?: string | null,
  matiere?: any,
): number {
  const fromMatiere = Number(matiere?.noteEliminatoire);
  if (Number.isFinite(fromMatiere) && fromMatiere > 0) return fromMatiere;
  const fromSnapshot = Number(details?.snapshot?.noteEliminatoire);
  if (Number.isFinite(fromSnapshot) && fromSnapshot > 0) return fromSnapshot;
  const nom = String(matiereNom ?? details?.snapshot?.nom ?? "").toLowerCase();
  return nom.includes("anglais") ? 4 : 6;
}

/**
 * Statut réussi/échoué d'un résultat de matière, calculé avec EXACTEMENT la
 * même fonction que le résultat définitif (`computeAdmisForMatiere`), donc avec
 * le barème de la matière et son seuil éliminatoire — jamais un simple ≥ 10.
 * Renvoie `null` tant qu'une QRC reste à corriger : aucun statut définitif.
 */
export function computeReussiForResult(
  row: {
    score_obtenu?: unknown;
    score_max?: unknown;
    matiere_nom?: string | null;
    reussi?: unknown;
    details?: any;
  },
  matiere?: any,
): boolean | null {
  if (isQrcPendingCorrection(row?.details)) return null;
  const seuil = getNoteEliminatoireSur20(row?.details, row?.matiere_nom, matiere);
  return computeAdmisForMatiere(
    row?.score_obtenu,
    row?.score_max,
    seuil,
    matiere?.noteSur,
    Boolean(row?.reussi),
  );
}

/**
 * Ligne technique créée par le filet de sécurité de la base lorsqu'une matière
 * a été marquée terminée sans que la note ait pu être écrite (« Sauvegarde en
 * attente »). Elle porte un score 0 qui n'est PAS une note : elle ne doit
 * jamais être affichée ni comptée comme un résultat.
 */
export function isResultPlaceholder(row: any): boolean {
  const d = (row && (row as any).details) || {};
  if (!d || typeof d !== "object") return false;
  const questions = (d as any).questions;
  const hasQuestions = Array.isArray(questions) && questions.length > 0;
  return Boolean((d as any).auto_created) && Boolean((d as any).needs_recompute) && !hasQuestions;
}

/** Retire les lignes techniques « en attente de finalisation » d'une liste de résultats. */
export function excludeResultPlaceholders<T>(rows: T[] | null | undefined): T[] {
  return ((rows as any[]) || []).filter((r) => !isResultPlaceholder(r)) as T[];
}
