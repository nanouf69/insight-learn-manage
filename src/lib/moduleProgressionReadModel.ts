import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetch-all-rows';
import { freshSessionRead } from '@/lib/sessionRpc';
import { avecEtatServeur, type EtatCompletionServeur } from '@/lib/etatCompletionServeur';
import { withSubmittedModuleProof, type CompletionEvidenceRow, type SubmittedModuleProof } from '@/lib/moduleCompletionEvidence';

export interface OwnedSubmittedModuleProof extends SubmittedModuleProof { apprenant_id: string }

/** Account-scoped server receipts only: never local queues, revisions or exam copies. */
export async function chargerPreuvesQuizModules(apprenantId: string): Promise<OwnedSubmittedModuleProof[]> {
  return freshSessionRead(() => fetchAllRows<OwnedSubmittedModuleProof>((from, to) => supabase
    .from('reponses_apprenants')
    .select('apprenant_id, exercice_id, status, submitted_at, reponses')
    .eq('apprenant_id', apprenantId).eq('status', 'submitted')
    .not('submitted_at', 'is', null).like('exercice_id', 'module_%_exo_%')
    .order('id').range(from, to)));
}

/** A display-only overlay; historical scores, timestamps and raw details remain intact. */
export function avecPreuvesQuizConfirmees<T extends CompletionEvidenceRow>(
  row: T, apprenantId: string, proofs: readonly OwnedSubmittedModuleProof[],
): T {
  return withSubmittedModuleProof(row, proofs.filter(p => p.apprenant_id === apprenantId));
}

/** One read model for dashboard cards and their quiz counts, including admin preview. */
export function projeterProgressionConfirmee<T extends CompletionEvidenceRow>(
  rows: readonly T[], apprenantId: string, states: ReadonlyMap<number, EtatCompletionServeur>,
  proofs: readonly OwnedSubmittedModuleProof[],
): T[] {
  return rows.map(row => {
    const state = states.get(Number(row.module_id));
    if (!state || (state.status ?? null) !== (row.status ?? null)
      || (row.completed_at && state.completed_at && Date.parse(row.completed_at) !== Date.parse(state.completed_at))) {
      throw new Error('Progression en cours de synchronisation — veuillez réessayer.');
    }
    return avecPreuvesQuizConfirmees(avecEtatServeur(row, states), apprenantId, proofs);
  });
}