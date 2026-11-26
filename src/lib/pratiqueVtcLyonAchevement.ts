import { hasRecordedAnswer } from '@/lib/moduleCompletionEvidence';
import { QUIZ_LYON_INITIAL_ID } from '@/lib/pratiqueVtcLyonFusion';
import type { VersionQuizLyon } from '@/lib/pratiqueVtcLyonVersion';

export const seuilQuizLyon = (version: VersionQuizLyon): 99 | 138 => version === 'enrichie' ? 138 : 99;

/** Présence de toutes les réponses attendues, pas une nouvelle règle de notation. Aucun effet de bord. */
export function reponsesQuizLyonCompletes(version: VersionQuizLyon, reponses: Record<string, unknown>): boolean {
  return Array.from({ length: seuilQuizLyon(version) }, (_, i) => i + 1)
    .every(id => hasRecordedAnswer(reponses[`${QUIZ_LYON_INITIAL_ID}-${id}`]));
}