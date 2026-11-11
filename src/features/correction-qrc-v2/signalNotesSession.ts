import { supabase } from '@/integrations/supabase/client';

/** Reuse the existing read-only result signals, scoped to the displayed roster. */
export function souscrireNotesSession(ids: string[], signal: () => void) {
  if (!ids.length) return () => {};
  let channel = supabase.channel(`notes-session-${Math.random().toString(36).slice(2)}`);
  for (const id of ids) {
    for (const table of ['core_exam_results', 'qrc_instances_v2', 'apprenant_quiz_results', 'exam_attempts_v2']) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `apprenant_id=eq.${id}` }, signal);
    }
  }
  channel.subscribe(status => { if (status === 'SUBSCRIBED') signal(); });
  return () => { void supabase.removeChannel(channel); };
}