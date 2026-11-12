import { reponseExacte } from "./bilanFutureCorrection";

export type SrTrainingQuestion = {
  uid: string; id: number; enonce: string;
  choix: { lettre: string; texte: string }[];
  correct: string[]; answer: string[];
};
export type SrTrainingRead = { sourceId: string; sourceType: "future" | "snapshot"; editorAt: string; questions: SrTrainingQuestion[]; unavailable: number };

/** Fail closed: the scoped server supplies proven identities, not a positional join in the browser. */
export function readSrTraining(data: unknown, sourceType: SrTrainingRead["sourceType"], sourceId: string): SrTrainingRead | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.source_id !== sourceId || d.source_type !== sourceType || typeof d.editor_at !== "string" || !Array.isArray(d.questions)) return null;
  const seen = new Set<string>();
  const questions: SrTrainingQuestion[] = [];
  for (const raw of d.questions) {
    if (!raw || typeof raw !== "object") return null;
    const q = raw as SrTrainingQuestion;
    if (typeof q.uid !== "string" || !q.uid || seen.has(q.uid) || !Number.isSafeInteger(q.id) || typeof q.enonce !== "string" || !Array.isArray(q.choix) || !Array.isArray(q.correct) || !Array.isArray(q.answer)) return null;
    const letters = q.choix.map(c => c?.lettre);
    if (letters.some(l => typeof l !== "string") || new Set(letters).size !== letters.length || q.choix.some(c => typeof c.texte !== "string") || !q.correct.length || [...q.correct, ...q.answer].some(l => typeof l !== "string" || !letters.includes(l))) return null;
    seen.add(q.uid); questions.push(q);
  }
  if (!Number.isSafeInteger(d.unavailable) || Number(d.unavailable) < 0) return null;
  return { sourceId, sourceType, editorAt: d.editor_at, questions, unavailable: Number(d.unavailable) };
}

/** Latest local practice selection wins, including an explicit empty selection. No persistence. */
export function srTrainingWrong(read: SrTrainingRead, local: Record<string, string[]> = {}): SrTrainingQuestion[] {
  return read.questions.filter(q => !reponseExacte(Object.hasOwn(local, q.uid) ? local[q.uid] : q.answer, q.correct));
}