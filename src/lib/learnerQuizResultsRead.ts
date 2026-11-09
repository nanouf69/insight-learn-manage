import { supabase } from '@/integrations/supabase/client';

/** Complete result history, deterministic pages. Never return a partial read. */
export async function lireResultatsQuizEleve(apprenantId: string, quizId?: string, quizType?: string) {
  const rows: any[] = [];
  for (let start = 0; ; start += 1000) {
    let query = supabase.from('apprenant_quiz_results').select('*').eq('apprenant_id', apprenantId);
    if (quizId) query = query.eq('quiz_id', quizId);
    if (quizType) query = quizType === 'examen_blanc'
      ? query.in('quiz_type', ['examen_blanc', 'examen_blanc_taxi']) : query.eq('quiz_type', quizType);
    const { data, error } = await query.order('id', { ascending: true }).range(start, start + 999);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  rows.sort((a,b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime()
    || new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || String(a.id).localeCompare(String(b.id)));
  return { data: rows, error: null };
}