import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BilanQuestionCard } from "./BilanFuturePresentation";
import { conserverChoixLocaux, faussesApresVerification, lireCorrigeActuel, projeterCopie, type Projection, type QuestionActuelle } from "@/lib/bilanCorrigeActuel";
import { reponseExacte } from "@/lib/bilanFutureCorrection";

export type LecteurCorrige = (snapshotId: string) => Promise<{ data?: unknown; error?: unknown }>;
const lecteurServeur: LecteurCorrige = (id) => (supabase as any).rpc("bilan_corrige_actuel_read", { p_snapshot: id });
export const INTERVALLE_RELECTURE_MS = 30_000;
type Local = Record<string, { signature: string; choix: string[] }>;

/** Read-only current-key view of a submitted legacy snapshot. Local practice only; admin = lectureSeule. */
export function BilanCorrigeActuel({ snapshotId, lectureSeule = false, lecteur = lecteurServeur, intervalle = INTERVALLE_RELECTURE_MS }:
  { snapshotId: string; lectureSeule?: boolean; lecteur?: LecteurCorrige; intervalle?: number }) {
  const [p, setP] = useState<Projection | null>(null);
  const [orig, setOrig] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<Local>({});
  const [round, setRound] = useState<string[] | null>(null); // cle list of current round
  const [checked, setChecked] = useState(false);
  const gen = useRef(0);
  const localRef = useRef(local); localRef.current = local;

  /** Returns the fresh projection, or null when stale/failed. Older replies never overwrite newer ones. */
  const load = useCallback(async (): Promise<Projection | null> => {
    const t = ++gen.current;
    let r: any; try { r = await lecteur(snapshotId); } catch { r = { error: true }; }
    if (t !== gen.current) return null;
    const lu = r?.error ? null : lireCorrigeActuel(r?.data, snapshotId);
    if (!lu) { setError(true); return null; }
    const next = projeterCopie(lu.lignes);
    setError(false); setOrig(lu.originalScore); setP(next);
    setLocal(conserverChoixLocaux(localRef.current, next));
    return next;
  }, [lecteur, snapshotId]);

  useEffect(() => {
    void load();
    let timer: ReturnType<typeof setInterval> | null = null;
    const arm = () => { if (timer) clearInterval(timer); timer = document.visibilityState === "visible" ? setInterval(() => { void load(); }, intervalle) : null; };
    const onVis = () => { if (document.visibilityState === "visible") void load(); arm(); };
    arm(); document.addEventListener("visibilitychange", onVis); window.addEventListener("focus", onVis);
    return () => { ++gen.current; if (timer) clearInterval(timer); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onVis); };
  }, [load, intervalle]);

  const run = async (action: "start" | "check") => {
    setBusy(true);
    const fresh = await load(); // wait for the current key before starting/verifying
    setBusy(false);
    if (!fresh) return;
    const loc = conserverChoixLocaux(localRef.current, fresh);
    if (action === "start") { setRound(faussesApresVerification(fresh, loc).map(q => q.cle)); setChecked(false); }
    else setChecked(true);
  };

  if (error && !p) return <p role="alert" className="text-destructive">Corrigé actuel indisponible : rien n'est modifié, réessayez plus tard.</p>;
  if (!p) return <p className="text-sm text-muted-foreground">Lecture du corrigé actuel…</p>;
  const choixDe = (q: QuestionActuelle) => local[q.cle]?.signature === q.signature ? local[q.cle].choix : q.practice;
  const roundQs = round ? p.questions.filter(q => q.statut === "ok" && round.includes(q.cle)) : [];
  const restantes = faussesApresVerification(p, local);
  return <div className="space-y-3" data-testid="bilan-corrige-actuel">
    {error && <p role="alert" className="text-destructive">Relecture échouée : dernier corrigé lu conservé.</p>}
    <p className="text-sm" data-testid="corrige-actuel-notes">Résultat d'origine enregistré (inchangé) : <strong>{orig ?? "—"}</strong> · Réponses remises correctes selon le corrigé actuel : <strong>{p.justes}/{p.rapprochees}</strong> · Note recalculée : <strong>{p.noteRecalculee ? `${p.noteRecalculee.sur20}/20` : p.motifNoteIndisponible === "bareme_non_prouve" ? "indisponible (barème de la copie non prouvé)" : "indisponible (questions non rapprochées)"}</strong></p>
    {(p.nonRapprochees > 0 || p.aReverifier > 0) && <p role="status" className="text-sm text-muted-foreground">{p.nonRapprochees} question(s) non rapprochée(s), {p.aReverifier} QRC à revérifier : exclues, sans note supposée.</p>}
    {!lectureSeule && <>
      <p data-testid="corrige-actuel-fausses">{restantes.length} question(s) fausse(s) à refaire.</p>
      {!round && <Button disabled={busy || !restantes.length} onClick={() => { void run("start"); }}>Commencer l’entraînement</Button>}
      {roundQs.map((q, i) => <BilanQuestionCard key={q.signature} question={{ id: i + 1, enonce: q.enonce, choix: q.choix } as any} index={i} disabled={checked || busy}
        selected={choixDe(q)} showResults={checked} correct={q.correct} wrong={checked && !reponseExacte(choixDe(q), q.correct)}
        onSelect={(l: string) => setLocal(prev => { const o = choixDe(q); return { ...prev, [q.cle]: { signature: q.signature, choix: o.includes(l) ? o.filter(x => x !== l) : [...o, l] } }; })} />)}
      {round && !checked && <Button disabled={busy} onClick={() => { void run("check"); }}>{busy ? "Lecture du corrigé…" : "Vérifier"}</Button>}
      {round && checked && <Button disabled={busy || !restantes.length} onClick={() => { void run("start"); }}>Refaire les fausses restantes ({restantes.length})</Button>}
    </>}
  </div>;
}
