import type { ExamenBlanc } from '@/components/cours-en-ligne/examens-blancs-data';
import { computeMoyenneExamen, computeMatiereScoreForAttempt } from '@/components/cours-en-ligne/examens-blancs-scoring';
import { lignesExamenAffichees } from './ebLignesAffichees';
import { attacherSourceUnique, noteExamenAffichee } from './noteExamenAffichee';
import type { CoreMatiereState } from './coreExamPublication';

/** Preview only: no persistence, no change to the default result selector. */
export function simulateCopySelection(account: string, exam: ExamenBlanc, rows: any[], resets: any[], core: CoreMatiereState[] | null, nonFiables: Set<string> | null, selectedId: string) {
  const scoped = rows.filter(r => r.apprenant_id === account && r.quiz_id === exam.id);
  const candidates = scoped.filter(r => String(r.id) === selectedId);
  if (candidates.length !== 1) throw new Error('Copie absente ou identité ambiguë.');
  const source = candidates[0];
  if (!exam.matieres.some(m => m.id === source.matiere_id) || !source.completed_at) throw new Error('Matière ou remise non prouvée.');
  const chosen = attacherSourceUnique(source, core, nonFiables);
  if (noteExamenAffichee(chosen).etat !== 'note') throw new Error('Note officielle non vérifiée : sélection impossible.');
  const defaults = lignesExamenAffichees(scoped, resets).map(r => attacherSourceUnique(r, core, nonFiables));
  // All contributions must have publishable proof, including historical fallback.
  if (defaults.some(r => noteExamenAffichee(r).etat !== 'note')) throw new Error('Une autre matière attend une note ou une vérification.');
  const calculate = (list: any[]) => computeMoyenneExamen(exam, m => computeMatiereScoreForAttempt(m, list.find(r => r.matiere_id === m.id)));
  return { before: calculate(defaults), after: calculate([...defaults.filter(r => r.matiere_id !== chosen.matiere_id), chosen]), chosen };
}