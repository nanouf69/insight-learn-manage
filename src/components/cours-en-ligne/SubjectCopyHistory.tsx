import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { freshSessionRead } from '@/lib/sessionRpc';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface HistoricalSubjectCopy { id: string; subject: string; date: string | null; questions: any[]; answers: Record<string, unknown>; score: string; }
/** Stable passage identity, no time-window matching, and no current-course fallback. */
export function historicalResultCopy(row: any): HistoricalSubjectCopy {
  const s = row.details?.snapshot;
  return { id: `result:${row.id}`, subject: row.matiere_nom ?? row.matiere_id,
    date: row.completed_at, questions: Array.isArray(s?.questions) ? s.questions : [],
    answers: row.details?.reponses ?? {}, score: `${row.score_obtenu ?? '—'} / ${row.score_max ?? '—'}` };
}
export function SubjectCopyHistory({ owner, account, exam }: {owner: string; account: string; exam: string}) {
  const [copies, setCopies] = useState<HistoricalSubjectCopy[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCopies([]); setSelected(''); setError('');
    const readAll = async (table: string, cols: string, filters: Record<string,string>) => {
      const rows: any[] = [];
      for (let offset = 0; ; offset += 500) {
        const {data, error} = await freshSessionRead(() => {
          let q: any = supabase.from(table as never).select(cols).eq('apprenant_id', account);
          for (const [key, value] of Object.entries(filters)) q = q.eq(key, value);
          return q.order(table === 'exam_attempts_v2' ? 'started_at' : 'created_at').range(offset, offset + 499);
        }, owner) as any;
        if (error) throw new Error('Lecture des anciennes copies impossible ; aucune copie remplacée.');
        rows.push(...(data ?? [])); if (!data || data.length < 500) return rows;
      }
    };
    void Promise.all([
      readAll('apprenant_quiz_results', '*', {quiz_id: exam}),
      readAll('exam_attempts_v2', 'attempt_id,snapshot,etat,finished_at,started_at', {exam_id: exam}),
    ]).then(async ([results, attempts]) => {
      const entries = results.map(historicalResultCopy);
      for (const a of attempts) {
        // Keep both records when the link is learner-supplied. Only the immutable imported-source link merges display entries.
        if (results.some(r => a.snapshot?.source_historique?.result_id === r.id)) continue;
        const {data, error} = await freshSessionRead(() => supabase.from('answer_state').select('question_id,valeur')
          .eq('apprenant_id', account).eq('attempt_id', a.attempt_id), owner);
        if (error) throw new Error('Lecture des réponses historiques impossible.');
        entries.push({id: `attempt:${a.attempt_id}`, subject: a.snapshot?.matiere ?? 'Matière', date: a.finished_at ?? a.started_at,
          questions: a.snapshot?.questions ?? [], answers: Object.fromEntries((data ?? []).map((r: any) => [r.question_id, r.valeur])), score: 'Note non rapprochée'});
      }
      if (!cancelled) { setCopies(entries); setSelected(entries[0]?.id ?? ''); setError(''); }
    }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [open, owner, account, exam]);
  const copy = copies.find(c => c.id === selected);
  return <section className="space-y-3">
    <Button variant="outline" onClick={() => setOpen(v => !v)}>Anciennes copies</Button>
    {open && <>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <Select value={selected} onValueChange={setSelected}><SelectTrigger aria-label="Ancienne copie"><SelectValue placeholder="Choisir une copie" /></SelectTrigger>
        <SelectContent>{copies.map((c,i) => <SelectItem key={c.id} value={c.id}>{c.subject} · Copie {i+1} · {c.date ? new Date(c.date).toLocaleString('fr-FR') : 'Date non enregistrée'}</SelectItem>)}</SelectContent>
      </Select>
      {copy && <div className="space-y-4"><p>{copy.score}</p>
        {!copy.questions.length && <p>Énoncés historiques non enregistrés. Réponses conservées :</p>}
        {(copy.questions.length ? copy.questions : Object.keys(copy.answers).map(id => ({id}))).map((q: any, i: number) =>
          <article key={String(q.id ?? i)} className="border-b pb-4 space-y-2">
            <p className="font-semibold">{i+1}. {q.enonce ?? `Question ${q.id}`}</p>
            {Array.isArray(q.choix) && <ul className="space-y-1">{q.choix.map((ch: any,j: number) => <li key={j}>{ch.lettre ?? String.fromCharCode(65+j)}. {ch.texte ?? ch.text ?? ch.enonce ?? ''}{ch.correct ? ' — Réponse attendue' : ''}</li>)}</ul>}
            <p className="break-words">{JSON.stringify(copy.answers[q.id] ?? copy.answers[String(q.id).split(':').at(-1) ?? ''] ?? 'Sans réponse')}</p>
          </article>)}
      </div>}
    </>}
  </section>;
}