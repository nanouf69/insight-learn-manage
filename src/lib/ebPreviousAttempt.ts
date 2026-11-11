import type { ExamenBlanc } from '@/components/cours-en-ligne/examens-blancs-data';
import { getAttemptNumber, getMatiereCanonicalKey } from '@/components/cours-en-ligne/examens-blancs-utils';
import { computeMatiereScoreForAttempt } from '@/components/cours-en-ligne/examens-blancs-scoring';
import { attacherSourceUnique, noteExamenAffichee } from './noteExamenAffichee';
import type { CoreMatiereState } from './coreExamPublication';

export type PreviousAttempt = { note: number | null; label: string; count: number; total: number };
/** Historical grades belong to their exact result, never the latest corrected copy. */
export function previousAttempt(exam: ExamenBlanc, rows: any[], core: CoreMatiereState[] | null, nonFiables: Set<string> | null): PreviousAttempt | null {
  const previous: Array<{ note: number | null; coefficient: number; nom: string }> = [];
  for (const m of exam.matieres) {
    const candidates = rows.filter(r => r.quiz_id === exam.id && getMatiereCanonicalKey(r.matiere_id, r.matiere_nom) === getMatiereCanonicalKey(m.id, m.nom));
    const latest = Math.max(0, ...candidates.map(getAttemptNumber));
    const older = candidates.filter(r => getAttemptNumber(r) < latest);
    const prior = Math.max(0, ...older.map(getAttemptNumber));
    const same = older.filter(r => getAttemptNumber(r) === prior);
    // Duplicate identities are fine; two distinct copies in the same tentative are not guessed.
    const ids = new Set(same.map(r => String(r.id)));
    if (ids.size !== 1) continue;
    const row = attacherSourceUnique(same[0], core, nonFiables);
    const official = noteExamenAffichee(row);
    const score = official.etat === 'note' ? computeMatiereScoreForAttempt(m, row) : null;
    previous.push({note: score?.noteSur20 ?? null, coefficient: m.coefficient || 1, nom: m.nom});
  }
  if (!previous.length) return null;
  const count = previous.length, total = exam.matieres.length;
  const label = count === 1 ? `Précédent passage — ${previous[0].nom} (matière seule)`
    : count === total ? 'Moyenne des précédents passages par matière'
    : `Précédents passages — ${count}/${total} matières (moyenne partielle)`;
  if (previous.some(p => p.note === null)) return {note:null,label,count,total};
  const sum = previous.reduce((n,p) => n + (p.note ?? 0) * p.coefficient, 0);
  const coef = previous.reduce((n,p) => n + p.coefficient, 0);
  return {note: Math.round(sum / coef * 10) / 10,label,count,total};
}