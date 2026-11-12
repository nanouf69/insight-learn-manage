import { useCallback, useEffect, useRef, useState } from 'react';
import { flushAnswerSavesOnUnload } from '@/lib/answerPersistence';
import { confirmerBilanRevision, enregistrerBilanRevision, lireBilanRevision, prochaineBilanRevision, type BilanRevision, type BilanRevisionSource } from '@/lib/bilanRevisionPersistence';

export function useBilanRevision(source: BilanRevisionSource | null) {
  const [revision, setRevision] = useState<BilanRevision | null>(null);
  const [statut, setStatut] = useState<'lecture'|'idle'|'saving'|'saved'|'error'>('idle');
  const [erreur, setErreur] = useState<string | null>(null);
  const latest = useRef<BilanRevision | null>(null);
  const generation = useRef(0);
  const finalizing = useRef(false);
  const key = JSON.stringify(source);
  const confirmer = useCallback(async (r: BilanRevision) => {
    const g = generation.current;
    try {
      const back = await confirmerBilanRevision(r);
      if (g !== generation.current || latest.current !== r) return;
      latest.current = back; setRevision(back); setStatut('saved'); setErreur(null);
    } catch (e) {
      if (g !== generation.current || latest.current !== r) return;
      setStatut('error'); setErreur(e instanceof Error ? e.message : 'Réponse non enregistrée');
    }
  }, []);
  useEffect(() => {
    const g = ++generation.current;
    latest.current = null; setRevision(null); setErreur(null); setStatut(source ? 'lecture' : 'idle');
    if (!source) return;
    void lireBilanRevision(source).then(r => {
      if (g !== generation.current) return;
      latest.current = r; setRevision(r); setStatut('idle');
    }).catch(e => { if (g === generation.current) { setStatut('error'); setErreur(e instanceof Error ? e.message : 'Reprise illisible'); } });
    return () => { generation.current++; flushAnswerSavesOnUnload(); };
    // Source identity, not object reference, controls the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    const retry = () => { const r = latest.current; if (r && !r.submitted) void confirmer(r); };
    const hide = () => { if (document.visibilityState === 'hidden') flushAnswerSavesOnUnload(); else retry(); };
    window.addEventListener('online', retry); window.addEventListener('pagehide', flushAnswerSavesOnUnload); document.addEventListener('visibilitychange', hide);
    return () => { window.removeEventListener('online', retry); window.removeEventListener('pagehide', flushAnswerSavesOnUnload); document.removeEventListener('visibilitychange', hide); };
  }, [confirmer]);
  const start = () => {
    if (!source || statut === 'lecture' || (erreur && !latest.current)) return false;
    const next = prochaineBilanRevision(source, latest.current);
    latest.current = next; setRevision(next); setErreur(null); return true;
  };
  const answer = (question: string, value: unknown) => {
    const r = latest.current;
    if (!r || r.submitted || finalizing.current) return;
    const next = { ...r, answers: { ...r.answers, [question]: value } };
    latest.current = next; setRevision(next); setStatut('saving'); setErreur(null);
    try { enregistrerBilanRevision(next); void confirmer(next); }
    catch (e) { setStatut('error'); setErreur(e instanceof Error ? e.message : 'Réponse non enregistrée'); }
  };
  const finish = async () => {
    const r = latest.current;
    if (!r || finalizing.current) return false;
    if (r.submitted) return true;
    finalizing.current = true; const g = generation.current; setStatut('saving');
    try {
      enregistrerBilanRevision(r);
      const back = await confirmerBilanRevision(r, true);
      if (g === generation.current) { latest.current = back; setRevision(back); setStatut('saved'); setErreur(null); }
      return back.submitted;
    } catch (e) { if (g === generation.current) { setStatut('error'); setErreur(e instanceof Error ? e.message : 'Reprise non terminée'); } return false; }
    finally { finalizing.current = false; }
  };
  const toggle = (question: string, letter: string) => {
    const cur = latest.current?.answers[question]; const selected = Array.isArray(cur) ? cur.map(String) : [];
    answer(question, (selected.includes(letter) ? selected.filter(x => x !== letter) : [...selected, letter]).sort());
  };
  return { revision, statut, erreur, start, answer, toggle, finish, retry: () => { const r = latest.current; if (r) void confirmer(r); } };
}