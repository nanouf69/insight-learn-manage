/**
 * Learner screen for the versioned future Bilan examen (modules 5 VTC / 11 TAXI).
 * Only rendered when the server route says 'future'. Reads a key-free projection,
 * writes only through receipt+version scoped RPCs; never touches legacy module_X_exo_Y data.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ExamQuestionImage } from "./ExamQuestionImage";
import { enqueueDraft, flushQueue, readQueue } from "@/lib/bilanFutureTransport";
import type { FutureReceipt } from "@/lib/bilanFutureVersion";

export const FUTURE_SUBJECT_NAMES = ["Réglementation T3P", "Gestion", "Sécurité routière", "Français", "Anglais"];

type Q = { id: number; enonce: string; image?: string; imageSize?: string; choix: { lettre: string; texte: string }[] };
type Passage = { receipt: FutureReceipt; questions: Q[]; answers: Record<string, string[]>; revisions: Record<string, number>; submitted: { correct_count: number; question_count: number } | null };

const rpc = (name: string, args: Record<string, unknown>) => (supabase as any).rpc(name, args);

/** Server route: 'future' | 'legacy'. A read error returns 'legacy' (status quo for everyone before opening). */
export async function lireRouteBilanFuture(moduleId: number): Promise<"future" | "legacy"> {
  if (moduleId !== 5 && moduleId !== 11) return "legacy";
  try {
    const { data, error } = await rpc("bilan_future_route", { p_module: moduleId });
    if (error) { console.error("[BilanFuture] route", error.code); return "legacy"; }
    return data === "future" ? "future" : "legacy";
  } catch { return "legacy"; }
}

export function BilanFutureExam({ moduleId, ownerId }: { moduleId: 5 | 11; ownerId: string }) {
  const base = moduleId === 5 ? 500 : 600;
  const [statuts, setStatuts] = useState<Record<number, { submitted: boolean; score?: string } | "erreur" | undefined>>({});
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [enAttente, setEnAttente] = useState(0);
  const flushing = useRef(false);

  const chargerStatuts = useCallback(async () => {
    const { data, error } = await (supabase as any).from("bilan_future_receipts")
      .select("id, exercise_id, bilan_future_submissions(correct_count, question_count)")
      .eq("owner_id", ownerId).eq("module_id", moduleId);
    if (error) { setErreur("Lecture de vos matières impossible. Rechargez la page."); return; }
    const s: typeof statuts = {};
    for (const r of data ?? []) {
      const sub = Array.isArray(r.bilan_future_submissions) ? r.bilan_future_submissions[0] : r.bilan_future_submissions;
      s[r.exercise_id] = sub ? { submitted: true, score: `${sub.correct_count}/${sub.question_count}` } : { submitted: false };
    }
    setStatuts(s);
  }, [ownerId, moduleId]);
  useEffect(() => { void chargerStatuts(); }, [chargerStatuts]);

  const flush = useCallback(async (receipt: FutureReceipt) => {
    if (flushing.current) return; flushing.current = true;
    try {
      const res = await flushQueue(localStorage, receipt, (a) => rpc("bilan_future_save_draft", a));
      setEnAttente(res.pending);
      if (res.rejected.length) setErreur("Une réponse a été refusée par le serveur (onglet ancien ou passage remis). Rechargez la page.");
    } finally { flushing.current = false; }
  }, []);

  const ouvrir = async (exo: number) => {
    setErreur(null); setPassage(null); setOuvert(exo);
    const o = await rpc("bilan_future_open", { p_module: moduleId, p_exercise: exo });
    if (o.error || !o.data?.id) { setErreur("Ouverture de la matière impossible. Rechargez la page."); return; }
    const receipt: FutureReceipt = { passageId: o.data.id, versionId: o.data.version_id, moduleId, exerciseId: exo, ownerId };
    const [qs, rs] = await Promise.all([rpc("bilan_future_questions", { p_receipt: receipt.passageId }), rpc("bilan_future_resume", { p_receipt: receipt.passageId })]);
    if (qs.error || rs.error || qs.data?.version_id !== receipt.versionId || rs.data?.version_id !== receipt.versionId) {
      setErreur("Chargement de votre passage impossible. Vos réponses sont conservées ; rechargez la page."); return;
    }
    const answers: Record<string, string[]> = {}, revisions: Record<string, number> = {};
    for (const [k, v] of Object.entries<any>(rs.data.answers ?? {})) { answers[k] = v.answer; revisions[k] = v.revision; }
    // Unsent local drafts of this exact receipt/version win over the server copy (newer revision).
    for (const d of readQueue(localStorage, receipt)) {
      if ((revisions[d.questionId] ?? 0) < d.revision) { answers[d.questionId] = d.answer; revisions[d.questionId] = d.revision; }
    }
    const sub = rs.data.submitted ? (await (supabase as any).from("bilan_future_submissions").select("correct_count, question_count").eq("receipt_id", receipt.passageId).maybeSingle()).data : null;
    setPassage({ receipt, questions: qs.data.questions ?? [], answers, revisions, submitted: sub });
    void flush(receipt);
  };

  const cocher = (q: Q, lettre: string, on: boolean) => {
    if (!passage || passage.submitted) return;
    const k = String(q.id);
    const cur = passage.answers[k] ?? [];
    const answer = (on ? [...new Set([...cur, lettre])] : cur.filter(x => x !== lettre)).sort();
    const revision = (passage.revisions[k] ?? 0) + 1;
    enqueueDraft(localStorage, passage.receipt, { questionId: q.id, revision, answer, token: crypto.randomUUID() });
    setPassage({ ...passage, answers: { ...passage.answers, [k]: answer }, revisions: { ...passage.revisions, [k]: revision } });
    void flush(passage.receipt);
  };

  const remettre = async () => {
    if (!passage) return;
    const manquantes = passage.questions.filter(q => !(passage.answers[q.id]?.length));
    if (manquantes.length) { setErreur(`Il reste ${manquantes.length} question(s) sans réponse.`); return; }
    if (!window.confirm("Remettre définitivement cette matière ? Vous ne pourrez plus modifier vos réponses.")) return;
    setEnvoi(true); setErreur(null);
    await flush(passage.receipt);
    const ans = Object.fromEntries(passage.questions.map(q => [String(q.id), passage.answers[q.id]]));
    const { data, error } = await rpc("bilan_future_submit", { p_receipt: passage.receipt.passageId, p_answers: ans });
    setEnvoi(false);
    if (error) { setErreur("La remise n'a pas été enregistrée. Vos réponses sont conservées ; réessayez."); return; }
    // Validation only after the server acknowledgement + readback.
    const back = await (supabase as any).from("bilan_future_submissions").select("correct_count, question_count").eq("receipt_id", passage.receipt.passageId).maybeSingle();
    if (back.error || !back.data || back.data.correct_count !== data.correct_count) { setErreur("Remise envoyée mais non relue. Rechargez la page pour vérifier."); return; }
    setPassage({ ...passage, submitted: back.data });
    void chargerStatuts();
  };

  if (ouvert !== null) {
    const nom = FUTURE_SUBJECT_NAMES[ouvert - base];
    return (
      <div className="mx-auto max-w-[1400px] p-4 space-y-4" data-testid="bilan-future-passage">
        <Button variant="outline" onClick={() => { setOuvert(null); setPassage(null); setErreur(null); void chargerStatuts(); }}>← Retour aux matières</Button>
        <h2 className="text-2xl font-bold">{nom}</h2>
        {erreur && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">{erreur}</div>}
        {!passage && !erreur && <p className="text-muted-foreground">Chargement de votre passage…</p>}
        {passage?.submitted && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 font-semibold" data-testid="bilan-future-resultat">
            Matière remise : {passage.submitted.correct_count}/{passage.submitted.question_count} bonnes réponses.
          </div>
        )}
        {passage?.questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border bg-card p-5 space-y-3" data-question-id={q.id}>
            <p className="text-xl font-semibold">Q{i + 1}. {q.enonce}</p>
            {q.image && <ExamQuestionImage image={q.image} alt={`Illustration question ${i + 1}`} className="max-h-72 w-auto rounded" />}
            <div className="space-y-2">
              {q.choix.map(c => (
                <label key={c.lettre} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                  <Checkbox checked={(passage.answers[q.id] ?? []).includes(c.lettre)} disabled={!!passage.submitted}
                    onCheckedChange={v => cocher(q, c.lettre, v === true)} aria-label={`Q${i + 1} choix ${c.lettre}`} />
                  <span><strong>{c.lettre}.</strong> {c.texte}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {passage && !passage.submitted && (
          <div className="flex items-center gap-4">
            <Button onClick={remettre} disabled={envoi}>{envoi ? "Remise en cours…" : "Remettre la matière"}</Button>
            {enAttente > 0 && <span className="text-sm text-muted-foreground">{enAttente} réponse(s) en attente d'envoi</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] p-4 space-y-3" data-testid="bilan-future-matieres">
      {erreur && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">{erreur}</div>}
      {FUTURE_SUBJECT_NAMES.map((nom, k) => {
        const s = statuts[base + k];
        return (
          <button key={k} onClick={() => void ouvrir(base + k)} className="w-full text-left rounded-xl border bg-card p-4 hover:bg-accent">
            <span className="text-lg font-semibold">{nom}</span>
            <span className="ml-3 text-sm text-muted-foreground">
              {s && s !== "erreur" ? (s.submitted ? `Remise — ${s.score}` : "En cours") : "À commencer"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
