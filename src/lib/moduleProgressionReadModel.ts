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

/** Account-scoped original-attempt rows of every status (drafts included), for pending-quiz labels only. */
export async function chargerReponsesQuizOrigine(apprenantId: string): Promise<OwnedSubmittedModuleProof[]> {
  const lignes = await freshSessionRead(() => fetchAllRows<OwnedSubmittedModuleProof>((from, to) => supabase
    .from('reponses_apprenants')
    .select('apprenant_id, exercice_id, status, submitted_at, reponses')
    .eq('apprenant_id', apprenantId).like('exercice_id', 'module_%_exo_%')
    .order('id').range(from, to)));
  return lignes.filter(l => /^module_\d+_exo_\d+$/.test(l.exercice_id));
}

/** A display-only overlay; historical scores, timestamps and raw details remain intact. */
export function avecPreuvesQuizConfirmees<T extends CompletionEvidenceRow>(
  row: T, apprenantId: string, proofs: readonly OwnedSubmittedModuleProof[],
): T {
  return withSubmittedModuleProof(row, proofs.filter(p => p.apprenant_id === apprenantId));
}

export const MESSAGE_SYNCHRONISATION_PROGRESSION = 'Progression en cours de synchronisation — veuillez réessayer.';

export const estErreurSynchronisation = (e: unknown) =>
  (e as { message?: string } | null)?.message === MESSAGE_SYNCHRONISATION_PROGRESSION;

/** Preuve serveur stricte commune (cartes, compteurs et jalons) : absent ou divergent = synchronisation. */
export function exigerEtatServeurConcordant<T extends CompletionEvidenceRow>(
  rows: readonly T[], states: ReadonlyMap<number, EtatCompletionServeur>,
): T[] {
  return rows.map(row => {
    const state = states.get(Number(row.module_id));
    if (!state || (state.status ?? null) !== (row.status ?? null)
      || (row.completed_at && state.completed_at && Date.parse(row.completed_at) !== Date.parse(state.completed_at))) {
      throw new Error(MESSAGE_SYNCHRONISATION_PROGRESSION);
    }
    return avecEtatServeur(row, states);
  });
}

/** One read model for dashboard cards and their quiz counts, including admin preview. */
export function projeterProgressionConfirmee<T extends CompletionEvidenceRow>(
  rows: readonly T[], apprenantId: string, states: ReadonlyMap<number, EtatCompletionServeur>,
  proofs: readonly OwnedSubmittedModuleProof[],
): T[] {
  return exigerEtatServeurConcordant(rows, states).map(row => avecPreuvesQuizConfirmees(row, apprenantId, proofs));
}

/** Quiz d'origine (jamais une révision) d'un module avec tentative soumise confirmée par le serveur, pour ce compte seulement. */
export function exosSoumisDuModule(proofs: readonly OwnedSubmittedModuleProof[], moduleId: number, apprenantId: string): Set<string> {
  const out = new Set<string>();
  for (const p of proofs) {
    if (p.apprenant_id !== apprenantId || p.status !== 'submitted' || !p.submitted_at) continue;
    const m = /^module_(\d+)_exo_(\d+)$/.exec(p.exercice_id);
    if (m && Number(m[1]) === Number(moduleId)) out.add(m[2]);
  }
  return out;
}
