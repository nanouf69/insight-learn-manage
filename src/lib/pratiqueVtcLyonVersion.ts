import { supabase } from '@/integrations/supabase/client';
import { getPendingAnswers } from '@/lib/answerPersistence';
import { QUIZ_LYON_INITIAL_ID, PREMIER_ID_AJOUT_LYON } from '@/lib/pratiqueVtcLyonFusion';

/**
 * Choix de version du quiz Lyon (module 8) par apprenant — LECTURE SEULE.
 * - aucune trace (réponse, tentative, révision, historique, validation de module, brouillon local) → "enrichie" (138)
 * - une trace qui contient déjà une réponse aux questions 100+ ou total_questions ≥ 100 → "enrichie" (passage commencé sur 138)
 * - toute autre trace → "initiale" (99, inchangée)
 * - erreur de lecture → "initiale" (on ne change jamais le quiz d'un apprenant sans preuve).
 */
export type VersionQuizLyon = 'initiale' | 'enrichie';

export const EXERCICES_LYON = [
  `module_8_exo_${QUIZ_LYON_INITIAL_ID}`,
  `module_8_revision_exo_${QUIZ_LYON_INITIAL_ID}`,
];

type Trace = { reponses?: unknown; total_questions?: number | null };

export function traceSurVersionEnrichie(t: Trace): boolean {
  if (Number(t.total_questions) >= PREMIER_ID_AJOUT_LYON) return true;
  const r = t.reponses && typeof t.reponses === 'object' ? (t.reponses as Record<string, unknown>) : {};
  return Object.keys(r).some((k) => {
    const m = k.match(/-(\d+)$/);
    return m ? Number(m[1]) >= PREMIER_ID_AJOUT_LYON : false;
  });
}

export function deciderVersionLyon(traces: Trace[], completionMentionneQuiz: boolean): VersionQuizLyon {
  if (traces.some(traceSurVersionEnrichie)) return 'enrichie';
  if (traces.length > 0 || completionMentionneQuiz) return 'initiale';
  return 'enrichie';
}

export async function lireVersionQuizLyon(apprenantId: string, client: any = supabase): Promise<VersionQuizLyon> {
  try {
    // Candidat serveur : cohorte figée au premier vrai enregistrement, jamais par le navigateur.
    // RPC encore absente en production = lecture historique existante, sans activation implicite.
    if (typeof client.rpc === 'function') {
      const cohorte = await client.rpc('quiz_lyon_seuil', { _apprenant_id: apprenantId });
      if (!cohorte.error && (cohorte.data === 99 || cohorte.data === 138)) {
        return cohorte.data === 138 ? 'enrichie' : 'initiale';
      }
      if (cohorte.error && !['PGRST202', '42883'].includes(cohorte.error.code)) return 'initiale';
    }
    const [rep, hist, comp] = await Promise.all([
      client.from('reponses_apprenants').select('reponses, total_questions').eq('apprenant_id', apprenantId).in('exercice_id', EXERCICES_LYON),
      client.from('reponses_apprenants_historique').select('reponses, total_questions').eq('apprenant_id', apprenantId).in('exercice_id', EXERCICES_LYON),
      client.from('apprenant_module_completion').select('details, status, completed_at').eq('apprenant_id', apprenantId).eq('module_id', 8),
    ]);
    if (rep.error || hist.error || comp.error) return 'initiale';
    const traces: Trace[] = [...(rep.data ?? []), ...(hist.data ?? [])];
    for (const id of EXERCICES_LYON) {
      const p = getPendingAnswers(apprenantId, id);
      if (p && Object.keys(p).length) traces.push({ reponses: p });
    }
    const mention = (comp.data ?? []).some((c: any) => c.status === 'completed'
      || (c.status == null && c.completed_at != null)
      || JSON.stringify(c?.details ?? null).includes(String(QUIZ_LYON_INITIAL_ID)));
    return deciderVersionLyon(traces, mention);
  } catch {
    return 'initiale';
  }
}
