import { getPointsParQuestion, isCalculQuestion } from "./examens-blancs-data";
import type { ExamenBlanc, Matiere, Question, CorrectionQRC, ExamScoreItem, Reponses, ReponseQCM, ReponseQRC, ResultatMatiere } from "./examens-blancs-types";

/** Safely coerce any value to string */
export function safeStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.join(", ");
  try { return JSON.stringify(v); } catch { return ""; }
}

export function toTimestamp(value: unknown): number {
  const ts = new Date(String(value ?? "")).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

export function safeArray<T = unknown>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  return [];
}

export function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundToHalfStep(value: number): number {
  return Math.round(value * 2) / 2;
}

export function normalizeNoteSur20(scoreObtenu: unknown, scoreMax: unknown, fallback?: unknown): number {
  const safeMax = Math.max(toFiniteNumber(scoreMax, 0), 0);
  if (safeMax <= 0) {
    return Number(clamp(toFiniteNumber(fallback, 0), 0, 20).toFixed(1));
  }
  const safeScore = clamp(toFiniteNumber(scoreObtenu, 0), 0, safeMax);
  return Number(((safeScore / safeMax) * 20).toFixed(1));
}

export function normalizeMatiereLookupValue(value: unknown): string {
  return safeStr(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function extractMatiereLetter(value: unknown): string | null {
  const raw = safeStr(value);
  const match = raw.match(/^\s*([a-g])\s*(?:[-(]|$)/i);
  return match?.[1]?.toUpperCase() ?? null;
}

export function buildMatiereLookupKeys(matiereId: unknown, matiereNom: unknown): string[] {
  const keys = new Set<string>();
  const normalizedId = normalizeMatiereLookupValue(matiereId);
  const normalizedNom = normalizeMatiereLookupValue(matiereNom);
  const letter = extractMatiereLetter(matiereNom) ?? extractMatiereLetter(matiereId);

  if (normalizedId) keys.add(`id:${normalizedId}`);
  if (normalizedNom) keys.add(`nom:${normalizedNom}`);
  if (letter) keys.add(`letter:${letter}`);

  // FIX: also add nom key with letter prefix stripped
  // so "D - Français" produces both nom:d francais AND nom:francais
  // This ensures matches survive matiere definition renames
  const rawNom = safeStr(matiereNom);
  const strippedNom = rawNom.replace(/^\s*[a-g]\s*[-–(]\s*/i, "").trim();
  if (strippedNom && strippedNom !== rawNom) {
    const normalizedStripped = normalizeMatiereLookupValue(strippedNom);
    if (normalizedStripped && normalizedStripped !== normalizedNom) {
      keys.add(`nom:${normalizedStripped}`);
    }
  }

  if (normalizedId === "dev commercial" || normalizedId === "developpement commercial") {
    keys.add("id:reglementation vtc");
  }
  if (normalizedId === "reglementation vtc") {
    keys.add("id:dev commercial");
    keys.add("id:developpement commercial");
  }

  return Array.from(keys);
}

export function getMatiereCanonicalKey(matiereId: unknown, matiereNom: unknown): string {
  const letter = extractMatiereLetter(matiereNom) ?? extractMatiereLetter(matiereId);
  if (letter) return `letter:${letter}`;
  const normalizedId = normalizeMatiereLookupValue(matiereId);
  if (normalizedId) return `id:${normalizedId}`;
  const normalizedNom = normalizeMatiereLookupValue(matiereNom);
  if (normalizedNom) return `nom:${normalizedNom}`;
  return "unknown";
}

export function shareLookupKey(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const setB = new Set(b);
  return a.some((k) => setB.has(k));
}

const STORAGE_PUBLIC_PATH = "/storage/v1/object/public/";
const SUPABASE_PUBLIC_BASE = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");

export function resolveExamQuestionImageUrl(image: unknown): string | null {
  const raw = safeStr(image).trim();
  if (!raw) return null;
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith(STORAGE_PUBLIC_PATH)) {
    return SUPABASE_PUBLIC_BASE ? `${SUPABASE_PUBLIC_BASE}${raw}` : raw;
  }
  if (raw.startsWith("/")) return raw;
  if (SUPABASE_PUBLIC_BASE && /^[^/]+\/.+/.test(raw)) {
    return `${SUPABASE_PUBLIC_BASE}${STORAGE_PUBLIC_PATH}${raw}`;
  }
  return raw;
}

export function addCacheBuster(url: string, token: number): string {
  return `${url}${url.includes("?") ? "&" : "?"}cb=${token}`;
}

export function getQuestionImageValue(question: unknown): string | null {
  if (!question || typeof question !== "object") return null;
  const raw = safeStr((question as any)?.image ?? (question as any)?.image_url).trim();
  return raw || null;
}

export function logSecurityImageDebug(examens: ExamenBlanc[], context: string) {
  const targets = ["EB3", "EB3-TAXI"];
  targets.forEach((examId) => {
    const exam = examens.find((item) => item.id === examId);
    const securite = exam?.matieres?.find((m) => m.id === "securite");
    if (!securite) return;
    const q2 = securite.questions?.find((q) => Number((q as any)?.id) === 2) as any;
    const q8 = securite.questions?.find((q) => Number((q as any)?.id) === 8) as any;
    console.log(`[ExamImages][${context}] ${examId} Q2/Q8`, {
      q2_image: q2?.image ?? null,
      q2_image_url: q2?.image_url ?? null,
      q8_image: q8?.image ?? null,
      q8_image_url: q8?.image_url ?? null,
      q2_resolved: resolveExamQuestionImageUrl(q2?.image ?? q2?.image_url ?? null),
      q8_resolved: resolveExamQuestionImageUrl(q8?.image ?? q8?.image_url ?? null),
    });
  });
}

export function pickBestScoreRow(prev: any, current: any) {
  if (!prev) return current;
  const prevCorrupted = isCorruptedZeroRow(prev);
  const currCorrupted = isCorruptedZeroRow(current);
  if (prevCorrupted && !currCorrupted) return current;
  if (!prevCorrupted && currCorrupted) return prev;
  const prevTs = toTimestamp(prev.created_at) || toTimestamp(prev.completed_at);
  const currTs = toTimestamp(current.created_at) || toTimestamp(current.completed_at);
  if (currTs > prevTs) return current;
  if (currTs < prevTs) return prev;
  return prev;
}

export function isCorruptedZeroRow(row: any): boolean {
  if (!row) return false;
  const score = toFiniteNumber(row.score_obtenu, -1);
  if (score > 0) return false;
  const reponses = row.details?.reponses;
  if (reponses && typeof reponses === "object" && Object.keys(reponses).length > 0) {
    return true;
  }
  return false;
}

export function normalizeSelectedChoices(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => safeStr(item).trim().toUpperCase()).filter(Boolean).sort();
  }
  const single = safeStr(value).trim().toUpperCase();
  return single ? [single] : [];
}

export function getCorrectQcmChoices(question: Question): string[] {
  const rawChoices = safeArray<any>(question?.choix);
  return rawChoices
    .map((choice, index) => ({
      isCorrect: Boolean(choice?.correct || choice?.correcte),
      letter: safeStr(choice?.lettre).trim().toUpperCase() || String.fromCharCode(65 + index),
    }))
    .filter((choice) => choice.isCorrect)
    .map((choice) => choice.letter)
    .filter(Boolean)
    .sort();
}

export function recoverCorruptedScoreRow(row: any, examensData: ExamenBlanc[]) {
  if (!isCorruptedZeroRow(row)) return null;
  const examDef = examensData.find((exam) => exam.id === row?.quiz_id);
  if (!examDef) return null;
  const rowKey = getMatiereCanonicalKey(row?.matiere_id, row?.matiere_nom);
  const matiere = examDef.matieres.find((m) => getMatiereCanonicalKey(m?.id, m?.nom) === rowKey);
  if (!matiere) return null;
  const reponses = row?.details?.reponses;
  if (!reponses || typeof reponses !== "object") return null;
  const correctionsIA = row?.details?.correctionsIA;
  let recoveredScore = 0;
  let recoveredMax = 0;
  safeArray<Question>(matiere.questions).forEach((question) => {
    if (!question?.type) return;
    const pointsQuestion = getPointsParQuestion(matiere.id, question.type, matiere);
    recoveredMax += pointsQuestion;
    const reponseQuestion = (reponses as Record<string, unknown>)[String(question.id)];
    if (question.type === "QCM") {
      const correctes = getCorrectQcmChoices(question);
      const donnees = normalizeSelectedChoices(reponseQuestion);
      if (JSON.stringify(correctes) === JSON.stringify(donnees)) {
        recoveredScore += pointsQuestion;
      }
      return;
    }
    if (question.type === "QRC") {
      const correction = correctionsIA?.[String(question.id)] ?? correctionsIA?.[question.id];
      if (correction && typeof correction === "object" && "pointsObtenus" in correction) {
        recoveredScore += clampToQuestionMax((correction as any).pointsObtenus, pointsQuestion);
      } else {
        const fallback = evaluateQrcDeterministic(question, reponseQuestion, pointsQuestion);
        recoveredScore += clampToQuestionMax(fallback.pointsObtenus, pointsQuestion);
      }
    }
  });
  if (recoveredMax <= 0) return null;
  const safeRecoveredScore = clamp(recoveredScore, 0, recoveredMax);
  return {
    score_obtenu: safeRecoveredScore,
    score_max: recoveredMax,
    note_sur_20: normalizeNoteSur20(safeRecoveredScore, recoveredMax),
  };
}

export function findScoreForMatiere(scores: ExamScoreItem[], matiere: Pick<Matiere, "id" | "nom">): ExamScoreItem | undefined {
  const expectedKeys = buildMatiereLookupKeys(matiere.id, matiere.nom);
  return scores.find((score) => shareLookupKey(score.lookupKeys, expectedKeys));
}

export function clampToQuestionMax(pointsObtenus: unknown, questionMax: number): number {
  const safeMax = Math.max(questionMax, 0);
  const safePoints = clamp(toFiniteNumber(pointsObtenus, 0), 0, safeMax);
  return clamp(roundToHalfStep(safePoints), 0, safeMax);
}

export const ENABLE_AI_QRC_CORRECTION = false;
export const AI_ONLY_UPGRADES = true;

export function normalizeAnswerText(value: unknown): string {
  return safeStr(value)
    .toLowerCase()
    .replace(/[àâäáã]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[îïí]/g, "i")
    .replace(/[ôöó]/g, "o")
    .replace(/[ùûüú]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function fuzzyContains(text: string, keyword: string): boolean {
  if (text.includes(keyword)) return true;
  if (keyword.length <= 3) return false;
  for (let i = 0; i < keyword.length; i++) {
    const partial = keyword.slice(0, i) + keyword.slice(i + 1);
    if (partial.length >= 3 && text.includes(partial)) return true;
  }
  const words = text.split(" ");
  for (const word of words) {
    if (word.length < 3 || keyword.length < 4) continue;
    if (Math.abs(word.length - keyword.length) <= 2) {
      let ki = 0;
      for (let wi = 0; wi < word.length && ki < keyword.length; wi++) {
        if (word[wi] === keyword[ki]) ki++;
      }
      if (ki >= keyword.length - 1) return true;
    }
  }
  return false;
}

export function hasCalculationDetail(value: unknown): boolean {
  const raw = safeStr(value);
  return /\d+\s*[\/×x\*\-\+]\s*\d+/.test(raw) || /=\s*\d/.test(raw);
}

export function extractRequestedElementsCount(enonce: string): number | null {
  const normalized = normalizeAnswerText(enonce);
  const digitMatch = normalized.match(/\b(\d{1,2})\b/);
  if (digitMatch) {
    const parsed = Number(digitMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 20) return parsed;
  }
  const numberWords: Record<string, number> = {
    un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5,
    six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  };
  for (const [word, value] of Object.entries(numberWords)) {
    if (new RegExp(`\\b${word}\\b`).test(normalized)) return value;
  }
  return null;
}

export function isEnumerativeQrcQuestion(question: Question): boolean {
  const normalizedEnonce = normalizeAnswerText(question.enonce || "");
  if (/\b(citez|donnez|indiquez|listez|enumerez|quels|quelles|nommez|mentionnez)\b/.test(normalizedEnonce)) {
    return true;
  }
  const chunks = safeStr(question.reponseQRC)
    .split(/[\.;]/)
    .map((chunk) => normalizeAnswerText(chunk))
    .filter(Boolean);
  return chunks.length >= 3;
}

export function buildExpectedQrcElements(question: Question): string[][] {
  const explicitEntries = Array.isArray(question.reponses_possibles) ? question.reponses_possibles : [];
  if (explicitEntries.length > 0) {
    const elements = explicitEntries
      .map((entry) =>
        Array.from(
          new Set(
            safeStr(entry).split("|").map((alt) => normalizeAnswerText(alt)).filter(Boolean)
          )
        )
      )
      .filter((alts) => alts.length > 0);
    if (elements.length > 0) return elements;
  }
  const normalizedExpected = normalizeAnswerText(question.reponseQRC || "");
  if (!normalizedExpected) return [];
  const stopwords = new Set([
    "avec", "dans", "pour", "sans", "dont", "plus", "moins", "etre", "avoir", "faire", "cette", "votre", "vous", "leur", "leurs", "entre", "sous", "aux", "des", "les", "une", "du", "de", "la", "le", "et", "ou", "au", "il", "elle", "ils", "elles", "son", "ses", "sur", "par", "qui",
  ]);
  const fallbackKeywords = Array.from(
    new Set(
      normalizedExpected.split(" ").map((word) => word.trim()).filter((word) => word.length >= 3 && !stopwords.has(word))
    )
  ).slice(0, 12);
  return fallbackKeywords.map((kw) => [kw]);
}

export function evaluateQrcDeterministic(question: Question, response: unknown, pointsQuestion: number): CorrectionQRC {
  const maxPoints = Math.max(toFiniteNumber(pointsQuestion, 0), 0);
  const responseRaw = safeStr(response);

  if (maxPoints <= 0) {
    return { estCorrect: false, pointsObtenus: 0, nombrefautes: 0, explication: "Barème indisponible pour cette question." };
  }
  if (!responseRaw.trim()) {
    return { estCorrect: false, pointsObtenus: 0, nombrefautes: 0, explication: "Aucune réponse fournie." };
  }

  if (isCalculQuestion(question)) {
    const responseCompact = responseRaw.replace(/\s/g, "").toLowerCase();
    const expectedResults = (question.reponses_possibles || [question.reponseQRC || ""])
      .map((r) => safeStr(r).replace(/\s/g, "").toLowerCase())
      .filter(Boolean);
    const hasResult = expectedResults.some((expected) => responseCompact.includes(expected));
    const hasDetail = hasCalculationDetail(responseRaw);
    let points = 0;
    const partialPoints = clampToQuestionMax(maxPoints / 2, maxPoints);
    if (hasResult && hasDetail) { points = maxPoints; }
    else if (hasResult) { points = partialPoints; }
    return {
      estCorrect: hasResult && hasDetail,
      pointsObtenus: clampToQuestionMax(points, maxPoints),
      nombrefautes: 0,
      explication: hasResult && hasDetail
        ? "Résultat correct avec détail du calcul."
        : hasResult
          ? `Résultat correct mais détail du calcul manquant → ${partialPoints}/${maxPoints} pts`
          : "Résultat incorrect.",
    };
  }

  const normalizedResponse = normalizeAnswerText(responseRaw);
  const expectedElements = buildExpectedQrcElements(question);

  if (expectedElements.length === 0) {
    return { estCorrect: false, pointsObtenus: 0, nombrefautes: 0, explication: "Réponse attendue indisponible pour cette question." };
  }

  const matched = expectedElements.filter((alternatives) =>
    alternatives.some((alt) => fuzzyContains(normalizedResponse, alt))
  ).length;
  const total = expectedElements.length;
  const requiredForFullPoints = total > 3 ? 3 : total <= 2 ? total : Math.ceil(total * 0.8);
  const gotFullPoints = matched >= requiredForFullPoints;
  const points = gotFullPoints
    ? maxPoints
    : clampToQuestionMax((matched / requiredForFullPoints) * maxPoints, maxPoints);

  return {
    estCorrect: gotFullPoints,
    pointsObtenus: points,
    nombrefautes: 0,
    explication: gotFullPoints
      ? `Correction déterministe : ${matched}/${total} élément(s) trouvés — totalité des points (≥${requiredForFullPoints} requis).`
      : `Correction déterministe : ${matched}/${total} élément(s) attendu(s) — ${requiredForFullPoints} requis pour tous les points.`,
  };
}

export function computeAdmisForMatiere(noteObtenue: unknown, maxPoints: unknown, noteEliminatoire: unknown, noteSur: unknown, fallback = false): boolean {
  const safeMax = Math.max(toFiniteNumber(maxPoints, 0), 0);
  if (safeMax <= 0) return fallback;
  const safeScore = clamp(toFiniteNumber(noteObtenue, 0), 0, safeMax);
  // noteEliminatoire is always expressed /20 (6/20 for all subjects, 4/20 for English)
  // Convert score to /20 then compare directly
  const noteSur20 = (safeScore / safeMax) * 20;
  const seuilSur20 = Math.max(toFiniteNumber(noteEliminatoire, 0), 0);
  return noteSur20 >= seuilSur20;
}

// ─── Extracted pure functions for testability ─────────────────────────

/** Normalize reponses keys — preserves string keys, converts numeric strings to numbers */
export function normalizeReponses(raw: any): Reponses {
  if (!raw || typeof raw !== "object") return {};
  const normalized: Reponses = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined && value !== null) {
      const numKey = Number(key);
      normalized[isNaN(numKey) ? (key as any) : numKey] = value as ReponseQCM | ReponseQRC;
    }
  }
  return normalized;
}

/** Determine if a QCM question has multiple correct answers */
export function computeIsMultiple(question: Question): boolean {
  return question?.type === "QCM" && (question.choix?.filter(c => c.correct).length || 0) > 1;
}

/** Apply a QCM answer change to a reponses object */
export function applyQCMChange(
  reponses: Reponses,
  qId: number,
  lettre: string,
  checked: boolean,
  isMultiple: boolean,
): Reponses {
  const current = (reponses[qId] as string[]) || [];
  if (!isMultiple) {
    return { ...reponses, [qId]: [lettre] };
  } else if (checked) {
    if (current.includes(lettre)) return reponses;
    return { ...reponses, [qId]: [...current, lettre] };
  } else {
    return { ...reponses, [qId]: current.filter(l => l !== lettre) };
  }
}

/** Persist exam session to sessionStorage */
export function persistExamSession(
  sessionKey: string,
  p: string,
  exId: string | null,
  mi: number,
  examStartTime: number,
  resultats: ResultatMatiere[] = [],
  currentReponses: Reponses = {},
  questionIndex = 0,
): void {
  try {
    if (p === "examen" && exId) {
      sessionStorage.setItem(sessionKey, JSON.stringify({
        phase: p, examenId: exId, matiereIndex: mi,
        examStartTime, resultats,
        currentReponses,
        questionIndex,
      }));
    } else {
      sessionStorage.removeItem(sessionKey);
    }
  } catch { }
}

/**
 * Extract the matiere key from an exercice_id.
 * exercice_id format: `${examId}__${matiereId}` (double underscore separator).
 */
export function extractMatiereKeyFromExerciceId(exerciceId: string, examId: string): string {
  const prefix = `${examId}__`;
  if (!exerciceId.startsWith(prefix)) return "";
  return exerciceId.slice(prefix.length);
}

/**
 * Determine if repairCorrectFlags should overwrite saved QCM correct flags.
 * Should ONLY repair when flags are genuinely lost (serialization bug),
 * NOT when the admin intentionally changed correct answers.
 */
export function shouldRepairCorrectFlags(savedQuestions: Question[], sourceQuestions: Question[]): boolean {
  const savedCorrectCount = savedQuestions.filter(
    q => q?.type === "QCM" && Array.isArray(q.choix) && q.choix.some(c => c.correct === true)
  ).length;
  const srcCorrectCount = sourceQuestions.filter(
    q => q?.type === "QCM" && Array.isArray(q.choix) && q.choix.some(c => c.correct === true)
  ).length;
  // Only repair when ALL correct flags are lost (savedCorrectCount === 0)
  // This prevents overwriting intentional admin edits
  if (srcCorrectCount > 0 && savedCorrectCount === 0) {
    return true;
  }
  return false;
}

/**
 * Merge texteSupport: saved (admin edit) takes priority over source.
 * Falls back to source only when saved is empty/undefined.
 */
export function mergeTexteSupport(sourceValue: string | undefined, savedValue: string | undefined): string {
  return savedValue || sourceValue || "";
}

/**
 * Check if a bilan answer is correct.
 * Handles both single-string and array answers, and compares ALL correct choices.
 */
export function isBilanAnswerCorrect(
  selected: string | string[] | undefined,
  choix: Array<{ lettre: string; correct?: boolean }>,
): boolean {
  if (!selected) return false;
  const correctLetters = choix.filter(c => c.correct).map(c => c.lettre).sort();
  if (correctLetters.length === 0) return false;
  if (Array.isArray(selected)) {
    return JSON.stringify([...selected].sort()) === JSON.stringify(correctLetters);
  }
  return correctLetters.length === 1 && selected === correctLetters[0];
}

/**
 * BROKEN legacy check (for testing purposes only — reproduces the bug).
 * Compares array to string, always returns false for multi-answer questions.
 */
export function isBilanAnswerCorrectBroken(
  selected: string | string[] | undefined,
  choix: Array<{ lettre: string; correct?: boolean }>,
): boolean {
  const correct = choix.find(c => c.correct);
  return !!(selected && correct && selected === correct.lettre);
}
