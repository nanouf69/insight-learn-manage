import { supabase } from '@/integrations/supabase/client';
import { answersAreEqual, canQueueAnswerSaveFor, enqueueAnswerSave, flushAnswerSavesAndWait, getPendingAnswers, primeKnownWriteSeq } from './answerPersistence';
import { lireReponsesExactes } from './originauxExacts';

export type BilanRevisionSource = { owner: string; module: number; exercise: number; receipt: string; version: string; questions: string[] };
export type BilanRevision = { id: string; source: BilanRevisionSource; answers: Record<string, unknown>; submitted: boolean };
export const bilanRevisionBase = (s: BilanRevisionSource) => `bilan_revision_${s.module}_${s.exercise}_${s.receipt}`;
export const memeSourceRevision = (a: unknown, b: BilanRevisionSource) => answersAreEqual(a, b);

/** Existing module transport only: no Bilan submission/draft, grade or completion write. */
export async function lireBilanRevision(source: BilanRevisionSource): Promise<BilanRevision | null> {
  const base = bilanRevisionBase(source);
  const rows: any[] = [];
  for (let start = 0; ; start += 100) {
    const { data, error } = await supabase.from('reponses_apprenants').select('id,exercice_id,reponses,status,submitted_at,write_seq,originaux_exacts,reponses_meta')
      .eq('apprenant_id', source.owner).eq('exercice_type', 'bilan_revision').like('exercice_id', `${base}%`).order('id').range(start, start + 99);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 100) break;
  }
  const scoped = rows.filter(r => r.exercice_id === base || new RegExp(`^${base}__r[0-9]+$`).test(r.exercice_id));
  scoped.sort((a,b) => Number(b.exercice_id.split('__r')[1] ?? 1) - Number(a.exercice_id.split('__r')[1] ?? 1));
  const row = scoped[0];
  if (!row) return null;
  const exact = lireReponsesExactes(row.reponses ?? {}, row.originaux_exacts, row.reponses_meta);
  if (Object.keys(exact.anomalies).length || !memeSourceRevision(exact.reponses.__source, source)) throw new Error('Identité de la reprise non confirmée');
  primeKnownWriteSeq(source.owner, row.exercice_id, row.write_seq);
  // Preserve explicit deselection in the pending journal, including empty arrays.
  const merged = { ...exact.reponses, ...(getPendingAnswers(source.owner, row.exercice_id) ?? {}) };
  return { id: row.exercice_id, source, answers: Object.fromEntries(source.questions.filter(k => k in merged).map(k => [k, merged[k]])), submitted: row.status === 'submitted' && !!row.submitted_at };
}

export function prochaineBilanRevision(source: BilanRevisionSource, previous: BilanRevision | null): BilanRevision {
  if (previous && !previous.submitted) return previous;
  const round = previous ? Number(previous.id.split('__r')[1] ?? 1) + 1 : 1;
  return { id: round === 1 ? bilanRevisionBase(source) : `${bilanRevisionBase(source)}__r${round}`, source, answers: {}, submitted: false };
}

export function enregistrerBilanRevision(revision: BilanRevision, completed = false): void {
  if (revision.submitted || !canQueueAnswerSaveFor(revision.source.owner)) throw new Error('Enregistrement non autorisé pour ce candidat');
  if (Object.keys(revision.answers).some(k => !revision.source.questions.includes(k))) throw new Error('Question étrangère à cette reprise');
  enqueueAnswerSave({ apprenant_id: revision.source.owner, exercice_id: revision.id, exercice_type: 'bilan_revision',
    // Omit module_id/total: a training answer must never validate the original module.
    reponses: { __source: revision.source, ...revision.answers }, completed,
    events: Object.entries(revision.answers).map(([question_id, valeur]) => ({ question_id, valeur })),
  });
}

/** Completion goes through the same CAS queue as answers, never a score-bearing upsert. */
export async function confirmerBilanRevision(revision: BilanRevision, completed = false): Promise<BilanRevision> {
  if (completed && revision.source.questions.some(k => {
    const v = revision.answers[k]; return Array.isArray(v) ? !v.length : typeof v !== 'string' || !v.trim();
  })) throw new Error('Répondez à toutes les questions avant de terminer');
  if (!await flushAnswerSavesAndWait(revision.source.owner, revision.id)) throw new Error('Réponses non confirmées : réessayez');
  const { data, error } = await supabase.from('reponses_apprenants').select('reponses,status,submitted_at,write_seq,originaux_exacts,reponses_meta')
    .eq('apprenant_id', revision.source.owner).eq('exercice_id', revision.id).maybeSingle();
  if (error || !data) throw new Error('Enregistrement non relu : réessayez');
  const exact = lireReponsesExactes(data.reponses ?? {}, data.originaux_exacts, data.reponses_meta);
  if (Object.keys(exact.anomalies).length || !answersAreEqual(exact.reponses, { __source: revision.source, ...revision.answers })) throw new Error('Autre réponse enregistrée : votre saisie reste conservée, vérifiez la reprise');
  primeKnownWriteSeq(revision.source.owner, revision.id, data.write_seq);
  const submitted = data.status === 'submitted' && !!data.submitted_at;
  if (completed && !submitted) {
    enregistrerBilanRevision(revision, true);
    return confirmerBilanRevision(revision, true);
  }
  return { ...revision, submitted };
}