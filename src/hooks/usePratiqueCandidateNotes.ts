import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { pratiqueNoteHTML } from '@/lib/pratiqueCandidateNotes';

type Draft = { text: string; revision: number; operationId: string; error?: string; conflict?: { note: string; revision: number } };

export function usePratiqueCandidateNotes(examDate: string, pratiqueDate: string) {
  const client = useQueryClient();
  const queryKey = ['pratique-candidate-notes', examDate, pratiqueDate];
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const key = (id: string) => JSON.stringify([examDate, pratiqueDate, id]);
  const load = async () => {
    const { data, error } = await supabase.rpc('get_pratique_candidate_notes', { p_exam_date: examDate, p_date_pratique: pratiqueDate });
    if (error) throw error;
    return data ?? [];
  };
  const query = useQuery({ queryKey, queryFn: load, enabled: !!examDate && !!pratiqueDate });
  const row = (id: string) => query.data?.find(n => n.apprenant_id === id);
  const draft = (id: string) => drafts[key(id)];
  const edit = (id: string, text: string) => {
    const k = key(id);
    setDrafts(prev => ({ ...prev, [k]: { text, revision: prev[k]?.revision ?? row(id)?.revision ?? 0, operationId: crypto.randomUUID() } }));
  };
  const save = async (id: string) => {
    const k = key(id);
    const d = drafts[k];
    if (!d || saving[k] || !query.isSuccess) return;
    setSaving(prev => ({ ...prev, [k]: true }));
    try {
      const { data, error } = await supabase.rpc('save_pratique_candidate_note', {
        p_apprenant_id: id, p_exam_date: examDate, p_date_pratique: pratiqueDate,
        p_note: d.text, p_expected_revision: d.revision, p_operation_id: d.operationId,
      });
      if (error) throw error;
      const latest = await load();
      const confirmed = latest.find(n => n.apprenant_id === id);
      if (!data || !confirmed || confirmed.revision < data.revision) throw new Error('Confirmation indisponible ; votre saisie est conservée.');
      client.setQueryData(queryKey, latest);
      setDrafts(prev => {
        if (prev[k]?.operationId !== d.operationId) return prev;
        const next = { ...prev }; delete next[k]; return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : (error as { message?: string })?.message ?? 'Enregistrement impossible ; saisie conservée.';
      let conflict: Draft['conflict'];
      if ((error as { code?: string })?.code === 'P0409') {
        try {
          const latest = await load();
          client.setQueryData(queryKey, latest);
          const current = latest.find(n => n.apprenant_id === id);
          conflict = { note: current?.note ?? '', revision: current?.revision ?? 0 };
        } catch { /* Keep the original draft when the server cannot be read. */ }
      }
      setDrafts(prev => ({ ...prev, [k]: { ...d, error: message, conflict } }));
    } finally { setSaving(prev => ({ ...prev, [k]: false })); }
  };
  const acceptBase = (id: string) => {
    const k = key(id);
    setDrafts(prev => {
      const d = prev[k];
      if (!d?.conflict) return prev;
      return { ...prev, [k]: { text: d.text, revision: d.conflict.revision, operationId: crypto.randomUUID() } };
    });
  };
  const emailNote = async (id: string) => {
    if (draft(id) || saving[key(id)]) throw new Error('Enregistrez la note de cet élève avant l’envoi.');
    const latest = await load();
    client.setQueryData(queryKey, latest);
    return pratiqueNoteHTML(latest.find(n => n.apprenant_id === id)?.note);
  };
  return { query, row, draft, edit, save, acceptBase, emailNote, isSaving: (id: string) => !!saving[key(id)] };
}