import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BilanQuestionCard } from "./BilanFuturePresentation";
import { readSrTraining, srTrainingWrong, type SrTrainingRead, type SrTrainingQuestion } from "@/lib/bilanSrTraining";
import { reponseExacte } from "@/lib/bilanFutureCorrection";

/** Own submitted VTC 5/502 only. Separate local practice; never mounts a save/submit handler. */
export function BilanSrTraining({ sourceType, sourceId, exerciseId = 502 }: { sourceType: "future" | "snapshot"; sourceId: string; exerciseId?: 502 | 505 | 506 }) {
  const [read, setRead] = useState<SrTrainingRead | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState<SrTrainingQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [checked, setChecked] = useState(false);
  const lock = useRef(false);
  const generation = useRef(0);
  const load = async (action: 'open' | 'start' | 'check' = 'open') => {
    if (lock.current) return;
    lock.current = true; setLoading(true); setError(false); setOpen(true);
    const token = ++generation.current;
    try {
      const result = await (supabase as any).rpc(exerciseId === 502 ? "bilan_vtc_sr_training_read" : "bilan_vtc_fg_training_read", { p_type: sourceType, p_source: sourceId });
      const next = result.error ? null : readSrTraining(result.data, sourceType, sourceId);
      if (token !== generation.current) return;
      if (!next) { setError(true); return; }
      // Keep only local answers whose UID, statement and letter/text mapping still match.
      const kept = Object.fromEntries(Object.entries(answers).filter(([uid]) => {
        const old = read?.questions.find(q => q.uid === uid), current = next.questions.find(q => q.uid === uid);
        const signature = (q: SrTrainingQuestion) => JSON.stringify([q.enonce, q.choix.map(c => [c.lettre,c.texte]).sort((a,b)=>a[0].localeCompare(b[0]))]);
        return old && current && signature(old) === signature(current);
      }));
      setRead(next); setAnswers(kept);
      setRound(action === 'open' ? null : action === 'start' ? srTrainingWrong(next,kept) : next.questions.filter(q => round?.some(r => r.uid === q.uid)));
      setChecked(action === 'check');
    } catch { if (token === generation.current) setError(true); }
    finally { lock.current = false; setLoading(false); }
  };
  const wrong = read ? srTrainingWrong(read, answers) : [];
  const start = () => { void load('start'); };
  return <div className="space-y-3" data-testid="bilan-sr-training">
    <Button variant="outline" disabled={loading} onClick={() => { void load(); }}>🎯 Refaire les fausses{loading ? " — Chargement…" : ""}</Button>
    {open && <div className="space-y-3 border-t border-border pt-3">
      <p className="text-sm text-muted-foreground">Entraînement uniquement — copie remise et note historique inchangées.</p>
      {error && <p role="alert" className="text-destructive">Correction actuelle indisponible : entraînement suspendu. Vos réponses sont conservées.</p>}
      {!error && !loading && read && <>
        {read.unavailable > 0 && <p role="status" className="text-muted-foreground">{read.unavailable} question(s) non rapprochée(s) : exclues de cet entraînement, sans correction supposée.</p>}
        <p data-testid="sr-wrong-count">{wrong.length} question(s) fausse(s) sur {read.questions.length} correction(s) confirmée(s).</p>
        {!round && <Button disabled={loading || !wrong.length} onClick={start}>Commencer l’entraînement</Button>}
        {round?.map((q, index) => <BilanQuestionCard key={q.uid} question={q} index={index} disabled={checked} selected={Object.prototype.hasOwnProperty.call(answers, q.uid) ? answers[q.uid] : q.answer} showResults={checked} correct={q.correct} wrong={checked && !reponseExacte(Object.prototype.hasOwnProperty.call(answers, q.uid) ? answers[q.uid] : q.answer, q.correct)} onSelect={l => setAnswers(prev => {
          const old = Object.prototype.hasOwnProperty.call(prev, q.uid) ? prev[q.uid] : q.answer;
          return { ...prev, [q.uid]: old.includes(l) ? old.filter(x => x !== l) : [...old, l] };
        })} />)}
        {round && !checked && <Button disabled={loading} onClick={() => { void load('check'); }}>Vérifier l’entraînement</Button>}
        {round && checked && <Button disabled={loading || !wrong.length} onClick={start}>Refaire les fausses restantes ({wrong.length})</Button>}
      </>}
      <Button variant="ghost" onClick={() => { ++generation.current; setOpen(false); }}>Retour à la copie</Button>
    </div>}
  </div>;
}