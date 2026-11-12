import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BilanQuestionCard } from "./BilanFuturePresentation";
import { lireCorrigeActuel, projeterCopie, type Projection } from "@/lib/bilanCorrigeActuel";
import { reponseExacte } from "@/lib/bilanFutureCorrection";

/** Read-only current-key view of a submitted legacy snapshot. Local practice, no writes. */
export function BilanCorrigeActuel({ snapshotId }: { snapshotId: string }) {
  const [p, setP] = useState<Projection | null>(null);
  const [orig, setOrig] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [local, setLocal] = useState<Record<string, string[]>>({});
  const [checked, setChecked] = useState(false);
  const gen = useRef(0);
  const load = useCallback(async () => {
    const t = ++gen.current;
    const r = await (supabase as any).rpc("bilan_corrige_actuel_read", { p_snapshot: snapshotId }).catch(() => ({ error: true }));
    if (t !== gen.current) return;
    const lu = r?.error ? null : lireCorrigeActuel(r.data, snapshotId);
    if (!lu) { setError(true); return; }
    setError(false); setOrig(lu.originalScore); setP(projeterCopie(lu.lignes));
  }, [snapshotId]);
  useEffect(() => {
    void load();
    const onVis = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVis); window.addEventListener("focus", onVis);
    return () => { ++gen.current; document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onVis); };
  }, [load]);
  if (error) return <p role="alert" className="text-destructive">Corrigé actuel indisponible : rien n'est modifié, réessayez plus tard.</p>;
  if (!p) return <p className="text-sm text-muted-foreground">Lecture du corrigé actuel…</p>;
  const answerOf = (q: Projection["fausses"][number]) => local[q.cle] ?? q.practice;
  return <div className="space-y-3" data-testid="bilan-corrige-actuel">
    <p className="text-sm">Note d'origine : <strong>{orig ?? "—"}</strong> · Note recalculée (corrigé actuel) : <strong>{p.noteRecalculee ? `${p.noteRecalculee.sur20}/20 (${p.noteRecalculee.juste}/${p.noteRecalculee.total})` : "incomplète"}</strong></p>
    {(p.nonRapprochees > 0 || p.aReverifier > 0) && <p role="status" className="text-sm text-muted-foreground">{p.nonRapprochees} question(s) non rapprochée(s), {p.aReverifier} QRC à revérifier : exclues, sans note supposée.</p>}
    <p data-testid="corrige-actuel-fausses">{p.fausses.length} question(s) fausse(s) à refaire.</p>
    {p.fausses.map((q, i) => <BilanQuestionCard key={q.cle} question={{ id: i + 1, enonce: q.enonce, choix: q.choix } as any} index={i} disabled={checked}
      selected={answerOf(q)} showResults={checked} correct={q.correct} wrong={checked && !reponseExacte(answerOf(q), q.correct)}
      onSelect={(l: string) => setLocal(prev => { const o = prev[q.cle] ?? q.practice; return { ...prev, [q.cle]: o.includes(l) ? o.filter(x => x !== l) : [...o, l] }; })} />)}
    {p.fausses.length > 0 && <Button variant="outline" onClick={() => { void load(); setChecked(c => !c); }}>{checked ? "Recommencer" : "Vérifier (corrigé relu)"}</Button>}
  </div>;
}
