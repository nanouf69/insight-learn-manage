export interface RetakeReturnNavigation {
  examId: string; phase: 'transition' | 'resultats' | 'examen'; index: number;
  filter: string[] | null; resultIds: string[];
  exerciseIds: Record<string, string>; tentative: number;
}
export const retakeReturnKey = (owner: string, account: string) => `subject_retake_return_${owner}_${account}`;
/** Navigation only. Answers/snapshots/results are never serialized or replayed here. */
export function rememberRetakeReturn(storage: Storage, owner: string, account: string, navigation: RetakeReturnNavigation) {
  const key = retakeReturnKey(owner, account);
  if (!storage.getItem(key)) storage.setItem(key, JSON.stringify(navigation));
}
export function readRetakeReturn(storage: Storage, owner: string, account: string): RetakeReturnNavigation | null {
  try {
    const raw = storage.getItem(retakeReturnKey(owner, account));
    const n = raw ? JSON.parse(raw) : null;
    return n && typeof n.examId === 'string' && Number.isInteger(n.index)
      && ['transition', 'resultats', 'examen'].includes(n.phase)
      && Array.isArray(n.resultIds) && n.exerciseIds && Number.isInteger(n.tentative) ? n : null;
  } catch { return null; }
}