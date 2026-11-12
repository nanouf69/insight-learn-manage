import type { ReleveSession } from './notesSession';
export type EtapeNotes = 'Chargement des candidats' | 'Récupération des notes' | 'Préparation du tableau';
export type ProgressionNotes = { etape: EtapeNotes; charges?: number; total?: number };
export type SuiviChargementNotes = {
  signal?: AbortSignal;
  progression?: (p: ProgressionNotes) => void;
  partiel?: (r: ReleveSession) => void;
};
export function verifierLectureNotes(suivi?: SuiviChargementNotes) {
  if (suivi?.signal?.aborted) throw new DOMException('Lecture annulée', 'AbortError');
}
export function signalerLectureNotes(suivi: SuiviChargementNotes | undefined, p: ProgressionNotes) {
  verifierLectureNotes(suivi); suivi?.progression?.(p);
}
/** A timed-out or superseded read cannot hold the page hostage or publish later. */
export function lectureNotesBornee<T>(task: Promise<T>, signal: AbortSignal, delai = 60_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup(); reject(new DOMException('Lecture annulée', 'AbortError')); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Le chargement dépasse 60 secondes. Réessayez ; les notes déjà affichées sont conservées.')); }, delai);
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    task.then(v => { cleanup(); resolve(v); }, e => { cleanup(); reject(e); });
  });
}