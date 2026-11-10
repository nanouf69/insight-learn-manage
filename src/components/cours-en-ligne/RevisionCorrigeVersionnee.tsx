import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  codeErreur, commanderRevisionVersionnee, decisionApresConflit, decouperLots, ouvrirRevisionVersionnee,
  relireRevisionVersionnee, type RevisionCommande, type RevisionRef, type RevisionVersionnee,
} from "@/lib/revisionCorrigeVersionnee";
import { bonnesReponses, cleSource, LIBELLES_RAISONS, provenanceTexte, statutPedagogique, type CorrigeSource } from "@/lib/corrigesSources";

export type QuestionNonRapprochee = {libelle: string; raison: CorrigeSource["raison"]};
const AUTOSAVE_MS = 1200;
const texteReponse = (a: unknown) => Array.isArray(a) ? (a as string[]).join(" + ") : a == null || a === "" ? "aucune" : String(a);
const egal = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const heure = (d?: string) => d ? new Date(d).toLocaleString("fr-FR", {timeZone: "Europe/Paris"}) : "";

/** Future revision screen; never writes exam answers, results, Bilan proofs or completion. */
export function RevisionCorrigeVersionnee({owner, refs, onExit, nonRapprochees = []}: {owner: string; refs: RevisionRef[]; onExit: () => void; nonRapprochees?: QuestionNonRapprochee[]}) {
  const lots = useMemo(() => decouperLots(refs), [refs]);
  const [lot, setLot] = useState(0);
  return <section aria-label="Révision versionnée" className="space-y-4 min-w-0">
    <h2 className="text-xl font-bold">Questions à refaire</h2>
    {nonRapprochees.length > 0 && <div role="note" className="rounded-md border border-border p-3 text-sm">
      <p className="font-semibold">{nonRapprochees.length} question(s) non rapprochée(s) : corrigé actuel non prouvé, pas de révision proposée.</p>
      <ul className="list-disc pl-5">{nonRapprochees.slice(0, 50).map((q, i) => <li key={i}>{q.libelle} — {q.raison ? LIBELLES_RAISONS[q.raison] : "non prouvé"}</li>)}</ul>
      {nonRapprochees.length > 50 && <p>… et {nonRapprochees.length - 50} autre(s).</p>}
    </div>}
    {lots.length === 0 ? <div><p>Aucune question rapprochée à refaire.</p><Button onClick={onExit}>Retour aux résultats</Button></div> : <>
      {lots.length > 1 && <div className="flex flex-wrap items-center gap-2">
        <span>Lot {lot + 1}/{lots.length} ({lots[lot].length} questions)</span>
        <Button variant="outline" disabled={lot === 0} onClick={() => setLot(l => l - 1)}>Lot précédent</Button>
        <Button variant="outline" disabled={lot === lots.length - 1} onClick={() => setLot(l => l + 1)}>Lot suivant</Button>
      </div>}
      <LotRevision key={lot} owner={owner} refs={lots[lot]} onExit={onExit}/>
    </>}
  </section>;
}

type Pending = {state: RevisionVersionnee; payload: RevisionCommande; operation: string};

function LotRevision({owner, refs, onExit}: {owner: string; refs: RevisionRef[]; onExit: () => void}) {
  const [state, setState] = useState<RevisionVersionnee | null>(null);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const bases = useRef<Record<string, unknown>>({});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{key: string; local: unknown; server: unknown} | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef<Pending | null>(null);
  const flight = useRef(false);
  const stateRef = useRef<RevisionVersionnee | null>(null);
  stateRef.current = state;
  const refsKey = JSON.stringify(refs);

  useEffect(() => {
    let alive = true;
    void ouvrirRevisionVersionnee(owner, refs).then(s => { if (alive) setState(s); })
      .catch(() => { if (alive) setError("Révision non ouverte : corrigé ou identité non confirmés."); });
    return () => { alive = false; };
    // Serialized stable question identities.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, refsKey]);

  const dirtyKeys = useMemo(() => state ? Object.keys(drafts).filter(k => !egal(drafts[k], state.answers[k])) : [], [drafts, state]);
  const dirty = dirtyKeys.length > 0 || flight.current || !!pending.current;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const clearDraft = (s: RevisionVersionnee, key: string) => setDrafts(d => {
    if (!(key in d) || !egal(d[key], s.answers[key])) return d;
    const {[key]: _drop, ...rest} = d; delete bases.current[key]; return rest;
  });

  const run = useCallback(async (cmd: Pending): Promise<RevisionVersionnee> => {
    pending.current = cmd;
    const s = await commanderRevisionVersionnee(cmd.state, cmd.payload, cmd.operation);
    pending.current = null; return s;
  }, []);

  /** Single-flight save of one question; lost acknowledgements are replayed with the same operation first. */
  const save = useCallback(async (key: string, answer: unknown) => {
    const current = stateRef.current;
    if (!current || flight.current || current.submission) return;
    flight.current = true; setBusy(true);
    try {
      let s = current;
      if (pending.current) { s = await run(pending.current); setState(s); }
      if (egal(s.answers[key], answer)) { clearDraft(s, key); setError(null); return; }
      try {
        s = await run({state: s, payload: {kind: "answer", key, answer}, operation: crypto.randomUUID()});
      } catch (e) {
        const code = codeErreur(e);
        if (code !== "P0555" && code !== "P0556") throw e;
        pending.current = null;
        const fresh = await relireRevisionVersionnee(owner, s.id);
        if (code === "P0556") setNotice("Le corrigé officiel a changé pendant votre révision : vérifiez votre réponse avec le corrigé affiché.");
        const decision = decisionApresConflit(fresh, key, bases.current[key], answer);
        if (decision === "conflit") { setState(fresh); setConflict({key, local: answer, server: fresh.answers[key]}); setError(null); return; }
        s = decision === "renvoyer" ? await run({state: fresh, payload: {kind: "answer", key, answer}, operation: crypto.randomUUID()}) : fresh;
      }
      setState(s); clearDraft(s, key); setError(null);
    } catch (e) {
      setError(codeErreur(e) === "P0554" ? "Cette révision est déjà remise." : "Réponse non confirmée par le serveur. Votre saisie locale est conservée ; elle sera renvoyée à l’identique.");
    } finally { flight.current = false; setBusy(false); }
  }, [owner, run]);

  // Durable autosave: each modified question is persisted server-side after a short pause.
  useEffect(() => {
    if (!state || state.submission || conflict || dirtyKeys.length === 0) return;
    const t = window.setTimeout(() => { const k = dirtyKeys[0]; void save(k, drafts[k]); }, AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [dirtyKeys, drafts, state, conflict, save]);

  const reread = async () => {
    if (!state || flight.current) return;
    try {
      flight.current = true; setBusy(true);
      if (pending.current) { setState(await run(pending.current)); }
      const s = await relireRevisionVersionnee(owner, state.id); setState(s); setError(null);
    } catch { setError("Relecture impossible. Votre saisie locale est conservée."); }
    finally { flight.current = false; setBusy(false); }
  };
  const submit = async () => {
    if (!state || flight.current || dirtyKeys.length || conflict) return;
    flight.current = true; setBusy(true);
    try {
      const s = await run(pending.current ?? {state, payload: {kind: "submit"}, operation: crypto.randomUUID()});
      setState(s); setError(null);
    } catch (e) {
      const code = codeErreur(e);
      if (code === "P0555" || code === "P0556") pending.current = null;
      setError(code === "P0557" ? "Toutes les réponses doivent être enregistrées avant de terminer."
        : "Réponse non confirmée : conflit ou corrigé modifié. Relisez sans perdre votre saisie, puis vérifiez-la.");
    } finally { flight.current = false; setBusy(false); }
  };

  const source = state?.sources[index];
  const key = source ? cleSource(source.source_type, source.source_id, source.question_id) : "";
  const answer = key in drafts ? drafts[key] : state?.answers[key];
  const edit = (value: unknown) => {
    if (!state) return;
    if (!(key in bases.current)) bases.current[key] = state.answers[key];
    setDrafts(d => ({...d, [key]: value}));
  };
  const q = source?.actuelle;
  const saved = state?.saved?.[key];
  const hasSaved = !!state && Object.prototype.hasOwnProperty.call(state.answers, key);

  return <div className="space-y-4 min-w-0">
    {error && <div role="alert" className="text-destructive"><p>{error}</p><Button variant="outline" disabled={busy} onClick={() => void reread()}>Relire les réponses enregistrées</Button></div>}
    {notice && <p role="status" className="font-semibold">{notice}</p>}
    {!state && !error && <p>Lecture du corrigé officiel…</p>}
    {state?.submission ? <div><p>Révision remise : {state.submission.perfect}/{state.submission.total} réponses parfaites.</p>
      {state.submission.qrc_a_verifier > 0 && <p>{state.submission.qrc_a_verifier} QRC à vérifier, sans note humaine attribuée.</p>}
      <p className="text-sm text-muted-foreground">La note et les réponses d’examen restent inchangées.</p>
      <Button onClick={onExit}>Retour aux résultats</Button></div> : q && state && source && <>
      <p>Question {index + 1}/{state.sources.length} · {source.exam_id}{source.tentative ? ` · tentative ${source.tentative}` : ""} · Corrigé officiel : {provenanceTexte(source)}</p>
      <p className="whitespace-pre-wrap break-words font-semibold">{q.enonce}</p>
      {source.reponse_initiale !== undefined && <p className="text-sm">Votre réponse à l’examen : {texteReponse(source.reponse_initiale)}</p>}
      {q.type === "QCM" ? <div className="space-y-2">{q.choix?.map(c => <label key={c.lettre} className="flex items-start gap-3 border border-border rounded-md p-3">
        <input type="checkbox" disabled={!!conflict} checked={Array.isArray(answer) && answer.includes(c.lettre)} onChange={() => {
          const prev = Array.isArray(answer) ? answer as string[] : [];
          edit(prev.includes(c.lettre) ? prev.filter(l => l !== c.lettre) : [...prev, c.lettre]);
        }}/><span>{c.lettre}. {c.texte}</span></label>)}</div>
        : <Textarea aria-label="Votre réponse" disabled={!!conflict} value={typeof answer === "string" ? answer : ""} onChange={e => edit(e.target.value)}/>}
      {conflict?.key === key && <div role="alert" className="rounded-md border border-destructive p-3 space-y-2">
        <p>Une autre fenêtre a enregistré une réponse différente pour cette question.</p>
        <p>Réponse enregistrée : {texteReponse(conflict.server)} · Votre saisie ici : {texteReponse(conflict.local)}</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => { bases.current[key] = conflict.server; setConflict(null); void save(key, conflict.local); }}>Garder ma saisie</Button>
          <Button variant="outline" disabled={busy} onClick={() => { setDrafts(d => { const {[key]: _x, ...r} = d; return r; }); delete bases.current[key]; setConflict(null); }}>Prendre la réponse enregistrée</Button>
        </div></div>}
      <Button disabled={busy || !!conflict} onClick={() => void save(key, answer ?? (q.type === "QCM" ? [] : ""))}>Enregistrer la réponse</Button>
      <p className="text-sm" aria-live="polite">{conflict?.key === key ? "Enregistrement suspendu : choisissez la réponse à garder." : dirtyKeys.includes(key) ? "Modification en cours d’enregistrement automatique…" : saved ? `Enregistrée le ${heure(saved.saved_at)} (sauvegarde n° ${saved.seq}).` : ""}</p>
      {hasSaved && <p>Dernière réponse enregistrée : {texteReponse(state.answers[key])} · {statutPedagogique(source, state.answers[key])}</p>}
      <p>Corrigé actuel : {bonnesReponses(q)}</p>
      <p className="text-sm text-muted-foreground">Corrigé figé de votre copie (sert à la note, inchangée) : {bonnesReponses(source.historique) || "non disponible"}.</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={index === 0 || busy} onClick={() => setIndex(i => i - 1)}>Précédente</Button>
        {index < state.sources.length - 1 ? <Button variant="outline" disabled={busy} onClick={() => setIndex(i => i + 1)}>Suivante</Button>
          : <Button disabled={busy || !!error || !!conflict || dirtyKeys.length > 0} onClick={() => void submit()}>Terminer la révision</Button>}
      </div>
    </>}
  </div>;
}
