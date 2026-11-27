import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetch-all-rows';
import { freshSessionRead } from '@/lib/sessionRpc';
import { avecEtatServeur, type EtatCompletionServeur } from '@/lib/etatCompletionServeur';
import { quizServeurModule, type QuizRef } from '@/lib/quizStatutListes';
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

/**
 * Server content only (module_editor_state): active, non-deleted question IDs per quiz, per module.
 * Read error = thrown (callers show « non vérifiable », never « confirmé »).
 */
export async function chargerQuizServeurModules(moduleIds?: readonly number[]): Promise<Map<number, Array<QuizRef & { questionIds: string[] }>>> {
  const { data, error } = await freshSessionRead<{ data: Array<{ module_id: number; module_data: unknown; deleted_exercices: unknown }> | null; error: unknown }>(() => {
    let q = supabase.from('module_editor_state').select('module_id, module_data, deleted_exercices');
    if (moduleIds) q = q.in('module_id', [...moduleIds]);
    return q as any;
  });
  if (error) throw error;
  const res = new Map<number, Array<QuizRef & { questionIds: string[] }>>();
  for (const row of data ?? []) res.set(Number(row.module_id), quizServeurModule(row.module_data, row.deleted_exercices));
  return res;
}

export async function chargerQuestionsServeurModules(moduleIds?: readonly number[]): Promise<Map<number, Map<string, string[]>>> {
  const quiz = await chargerQuizServeurModules(moduleIds);
  return new Map([...quiz].map(([m, l]) => [m, new Map(l.map((q) => [q.id, q.questionIds]))]));
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
