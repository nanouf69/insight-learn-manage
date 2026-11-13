import type { ExamenBlanc, Question } from "@/components/cours-en-ligne/examens-blancs-data";

export type ExamCurrentCorrection = { exam: ExamenBlanc; savedAt: string };
/** Separate pedagogical document, NEVER an input to scoring or answer mapping. */
export function currentCorrectionFor(source: ExamCurrentCorrection | null, examId: string, subject: string, frozen: Question) {
  if (!source || source.exam.id !== examId || examId.toLowerCase().startsWith("bilan-")) return null;
  const subjects = source.exam.matieres.filter(m => m.id === subject);
  if (subjects.length !== 1) return null;
  const id = String(frozen.id).startsWith(`${subject}:`) ? String(frozen.id).slice(subject.length + 1) : String(frozen.id);
  const candidates = subjects[0].questions.filter(q => String(q.id) === id);
  if (candidates.length !== 1 || candidates[0].type !== frozen.type) return null;
  const current = candidates[0];
  if (current.type !== "QCM" || !current.choix?.length || !current.choix.some(c => c.correct)) return null;
  const letters = current.choix.map(c => c.lettre);
  if (new Set(letters).size !== letters.length) return null;
  const shape = (q: Question) => JSON.stringify([q.enonce, (q.choix ?? []).map(c => [c.lettre, c.texte, c.correct === true])]);
  if (shape(current) === shape(frozen)) return null;
  return { current, savedAt: source.savedAt, contentChanged: JSON.stringify([current.enonce, current.choix.map(c => [c.lettre,c.texte])]) !== JSON.stringify([frozen.enonce, (frozen.choix ?? []).map(c => [c.lettre,c.texte])]) };
}

/** No static fallback: absence, invalid date or identity mismatch is a failed read. */
export function parseCurrentCorrection(row: unknown, examId: string): ExamCurrentCorrection {
  const r = row as { module_data?: ExamenBlanc; updated_at?: string } | null;
  if (!r?.module_data || r.module_data.id !== examId || !Array.isArray(r.module_data.matieres) || !r.updated_at || !Number.isFinite(Date.parse(r.updated_at))) throw new Error("Corrigé administrateur non confirmé");
  if (r.module_data.matieres.some(m => !m || !Array.isArray(m.questions))) throw new Error("Corrigé administrateur incomplet");
  return { exam: r.module_data, savedAt: r.updated_at };
}