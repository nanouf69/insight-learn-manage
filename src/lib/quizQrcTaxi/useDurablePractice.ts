import { useEffect, useRef, useState } from 'react';
import { AnswerValue, PracticeQuiz, validAnswer, missingAnswers } from './manifest';
import { LocalJournal, PendingAnswer, PracticeAttempt, loadJournal, persistJournal, openPractice, readPractice, savePractice, submitPractice, sameAnswer } from './durable';

export function useDurablePractice(account: string | undefined, quiz: PracticeQuiz) {
  const [attempt, setAttempt] = useState<PracticeAttempt>();
  const [pending, setPending] = useState<PendingAnswer[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const submitFlight = useRef(false);
  const ref = useRef<{ journal: LocalJournal; attempt?: PracticeAttempt; flight: boolean; scope: string }>({ journal: { opening: '', pending: [] }, flight: false, scope: '' });
  const scope = `${account}:${quiz}`;
  const publish = () => { setAttempt(ref.current.attempt); setPending([...ref.current.journal.pending]); };
  const persist = () => { if (account) persistJournal(account, quiz, ref.current.journal); publish(); };
  const accept = (a: PracticeAttempt) => { ref.current.attempt = a; ref.current.journal.attempt = a.id; publish(); };

  const synchronize = async () => {
    if (!account || ref.current.flight || ref.current.scope !== scope) return;
    ref.current.flight = true; setBusy(true); setError('');
    try {
      let a = ref.current.attempt;
      if (!a) {
        a = ref.current.journal.attempt ? await readPractice(account, quiz, ref.current.journal.attempt) : await openPractice(account, quiz, ref.current.journal.opening);
        if (ref.current.scope !== scope) return;
        accept(a); persist();
      }
      while (ref.current.journal.pending.length && !a.submitted_at) {
        const entry = ref.current.journal.pending[0];
        if (!entry) break;
        // Unacknowledged identical retry goes through server operation id, never a new operation.
        try { a = await savePractice(account, quiz, a.id, a.revision, entry); }
        catch (e) {
          if ((e as { code?: string }).code !== '40001') throw e;
          a = await readPractice(account, quiz, a.id);
          if (ref.current.scope !== scope) return;
          accept(a);
          if (!sameAnswer(a.answers[entry.key], entry.base) && !sameAnswer(a.answers[entry.key], entry.answer)) {
            setConflicts([entry.key]); throw new Error('Une autre réponse est sauvegardée sur un autre appareil. Vos deux réponses sont conservées.');
          }
          // A different question changed; preserving its fresh revision is safe.
          a = await savePractice(account, quiz, a.id, a.revision, entry);
        }
        if (ref.current.scope !== scope) return;
        ref.current.journal.pending = ref.current.journal.pending.filter(p => p.operation !== entry.operation);
        // Later edits to this answer are based on this acknowledgement, not an old server copy.
        for (const later of ref.current.journal.pending) if (later.key === entry.key) later.base = entry.answer;
        accept(a); persist();
      }
      if (a.submitted_at && ref.current.journal.pending.length) throw new Error('Cette tentative est déjà soumise. La saisie locale tardive est conservée séparément.');
    } catch (e) { if (ref.current.scope === scope) setError(e instanceof Error ? e.message : 'Sauvegarde indisponible ; saisie conservée.'); }
    finally { if (ref.current.scope === scope) { ref.current.flight = false; setBusy(false); setLoading(false); publish(); } }
  };
  useEffect(() => {
    ref.current = { journal: account ? loadJournal(account, quiz) : { opening: '', pending: [] }, flight: false, scope };
    setAttempt(undefined); setError(''); setConflicts([]); setLoading(true); setPending([...ref.current.journal.pending]);
    if (!account) { setLoading(false); setError('Connexion requise.'); return; }
    void synchronize();
    return () => { ref.current.scope = ''; };
    // Account/quiz is the complete persistence boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);
  useEffect(() => {
    if (!pending.length || conflicts.length || error) return;
    const timer = setTimeout(() => { void synchronize(); }, 550);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, conflicts, error]);
  useEffect(() => {
    const resume = async () => {
      if (ref.current.flight || !account || ref.current.scope !== scope) return;
      if (ref.current.attempt && !ref.current.journal.pending.length) {
        try { const a = await readPractice(account, quiz, ref.current.attempt.id); if (ref.current.scope === scope) accept(a); }
        catch { setError('Relecture indisponible ; vos réponses restent affichées.'); }
      } else await synchronize();
    };
    window.addEventListener('online', resume); window.addEventListener('focus', resume);
    return () => { window.removeEventListener('online', resume); window.removeEventListener('focus', resume); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);
  const edit = (key: string, answer: AnswerValue) => {
    const a = ref.current.attempt;
    if (!a || a.submitted_at || ref.current.journal.submit || !account) return;
    const rule = a.manifest.find(r => r.key === key);
    if (!rule || !validAnswer(rule, answer, false)) return;
    const queued = ref.current.journal.pending.filter(p => p.key === key).at(-1);
    const entry = { key, answer, base: queued?.answer ?? a.answers[key], operation: crypto.randomUUID() };
    ref.current.journal.pending.push(entry);
    setError('');
    try { persist(); } catch { publish(); setError('Sauvegarde locale indisponible. Gardez cette page ouverte.'); }
  };
  const resolve = (key: string, useLocal: boolean) => {
    const a = ref.current.attempt; if (!a || !account) return;
    const entries = ref.current.journal.pending.filter(p => p.key === key); const last = entries.at(-1);
    // Preserve the losing local copy in a separate append-only archive; never discard it silently.
    try {
      const archiveKey = `qrc-practice:conflicts:${account}:${a.id}`;
      const prior = JSON.parse(localStorage.getItem(archiveKey) ?? '[]');
      localStorage.setItem(archiveKey, JSON.stringify([...prior, { entries, server: a.answers[key], at: new Date().toISOString() }]));
      ref.current.journal.pending = ref.current.journal.pending.filter(p => p.key !== key);
      if (useLocal && last) ref.current.journal.pending.push({ ...last, base: a.answers[key], operation: crypto.randomUUID() });
      setConflicts([]); persist(); setError('');
    } catch { setError('Impossible de conserver les deux versions ; aucune version écartée.'); }
  };
  const submit = async () => {
    if (!account || ref.current.flight || conflicts.length || submitFlight.current) return;
    submitFlight.current = true;
    await synchronize();
    const a = ref.current.attempt;
    if (!a || ref.current.journal.pending.length || missingAnswers(a.manifest, a.answers).length) { submitFlight.current = false; return; }
    ref.current.flight = true; setBusy(true); setError('');
    try {
      const command = ref.current.journal.submit ?? { operation: crypto.randomUUID(), revision: a.revision };
      ref.current.journal.submit = command; persist();
      const result = await submitPractice(account, quiz, a.id, command.revision, command.operation);
      if (ref.current.scope !== scope) return;
      if (!result.submitted_at) { ref.current.journal.submit = undefined; accept(result); persist(); setError('Des réponses sont encore manquantes.'); return; }
      const proof = await readPractice(account, quiz, a.id);
      if (ref.current.scope !== scope) return;
      if (proof.submit_operation !== command.operation || !proof.submitted_at) throw new Error('Confirmation de soumission non reçue.');
      ref.current.journal.submit = undefined; accept(proof); persist();
    } catch (e) {
      if ((e as { code?: string }).code === '40001') { ref.current.journal.submit = undefined; persist(); }
      setError(e instanceof Error ? e.message : 'Envoi non confirmé ; réessayez avec la même identité.');
    } finally { if (ref.current.scope === scope) { ref.current.flight = false; setBusy(false); } }
  };
  const fresh = async () => {
    if (!account || ref.current.flight || !ref.current.attempt?.submitted_at || pending.length) return;
    ref.current.flight = true; setBusy(true);
    try {
      const operation = crypto.randomUUID();
      const result = await openPractice(account, quiz, operation, true);
      if (ref.current.scope !== scope) return;
      ref.current.journal = { opening: operation, attempt: result.id, pending: [] }; accept(result); persist();
    } catch (e) { setError(e instanceof Error ? e.message : 'Nouvelle tentative indisponible.'); }
    finally { submitFlight.current = false; if (ref.current.scope === scope) { ref.current.flight = false; setBusy(false); } }
  };
  const answers = { ...attempt?.answers };
  for (const entry of pending) answers[entry.key] = entry.answer;
  return { attempt, answers, pending, error, busy, conflicts, loading, edit, synchronize, resolve, submit, fresh };
}