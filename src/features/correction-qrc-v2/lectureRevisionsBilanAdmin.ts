import { supabase } from '@/integrations/supabase/client';
import { lireReponsesExactes } from '@/lib/originauxExacts';
import type { LigneRevision } from './revisionsAdmin';

/** Persisted revision answers only; source metadata never authorizes original-copy attribution. */
export async function lireRevisionsBilanAdmin(owner: string): Promise<LigneRevision[]> {
  const rows: any[] = [];
  for (let start = 0; ; start += 100) {
    const { data, error } = await supabase.from('reponses_apprenants').select('id,apprenant_id,exercice_id,reponses,updated_at,status,submitted_at,originaux_exacts,reponses_meta')
      .eq('apprenant_id', owner).eq('exercice_type', 'bilan_revision').order('id').range(start, start + 99);
    if (error) throw error;
    rows.push(...(data ?? [])); if (!data || data.length < 100) break;
  }
  return rows.flatMap(r => {
    if (r.apprenant_id !== owner) return [];
    const exact = lireReponsesExactes(r.reponses ?? {}, r.originaux_exacts, r.reponses_meta);
    const source = exact.reponses.__source as any;
    if (!source || source.owner !== owner || !Array.isArray(source.questions)) return [];
    return source.questions.filter((key: string) => Object.prototype.hasOwnProperty.call(exact.reponses, key)).map((key: string) => ({
      cle: `${r.id}:${key}`, revisionId: r.id, examen: `Bilan examen · module ${source.module}`, revision: r.exercice_id.split('__r')[1] ?? '1',
      matiere: `Exercice ${source.exercise}`, question: key, tentative: null, sourceId: null, initiale: undefined, derniere: exact.reponses[key],
      type: Array.isArray(exact.reponses[key]) ? 'QCM' : 'QRC', heureQuestion: null, heureEtat: r.updated_at,
      terminee: r.status === 'submitted' && !!r.submitted_at,
      cause: Object.keys(exact.anomalies).length ? 'Original exact non vérifiable' : 'Réponse initiale distincte : non rapprochée dans cette consultation',
    }));
  });
}