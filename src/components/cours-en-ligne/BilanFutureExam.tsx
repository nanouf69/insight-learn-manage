/**
 * Learner screen for the versioned future Bilan examen (modules 5 VTC / 11 TAXI).
 * Only rendered when the server route says 'future'. Reads a key-free projection,
 * writes only through receipt+version scoped RPCs; never touches legacy module_X_exo_Y data.
 * After submission: read-only correction (bilan_future_correction) and a local-only
 * review of the wrong questions of this passage (never saved, never changes the submission).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RichText } from "@/lib/richText";
import { ExamQuestionImage } from "./ExamQuestionImage";
import { enqueueDraft, flushQueue, readQueue } from "@/lib/bilanFutureTransport";
import type { FutureReceipt } from "@/lib/bilanFutureVersion";
import { lireCorrection, questionsFausses, reponseExacte, type Correction } from "@/lib/bilanFutureCorrection";
import { baremeReference, examenReferenceBilan, moyenneBilan, noterMatiere, type BaremeMatiere, type NoteMatiere } from "@/lib/bilanFutureBareme";
import { fetchLiveExamens } from "./useLiveExamens";

export const FUTURE_SUBJECT_NAMES = ["Réglementation T3P", "Gestion", "Sécurité routière", "Français", "Anglais"];

type Q = { id: number; enonce: string; image?: string; imageSize?: string; support?: { numero: number; paragraphes: string[] }; choix: { lettre: string; texte: string }[] };
type Passage = { receipt: FutureReceipt; questions: Q[]; answers: Record<string, string[]>; revisions: Record<string, number>; submitted: { correct_count: number; question_count: number } | null };
type Revision = { ids: number[]; answers: Record<string, string[]>; validee: boolean };

const rpc = (name: string, args: Record<string, unknown>) => (supabase as any).rpc(name, args);
// Same image sizes as the original exercise screen.
const IMAGE_SIZES: Record<string, string> = { sm: "max-h-40", md: "max-h-64", lg: "max-h-96", xl: "max-h-[32rem]", "2xl": "max-h-[48rem]" };

/** Server route: 'future' | 'legacy'. A read error returns 'legacy' (status quo for everyone before opening). */
export async function lireRouteBilanFuture(moduleId: number): Promise<"future" | "legacy"> {
  if (moduleId !== 5 && moduleId !== 11) return "legacy";
  try {
    const { data, error } = await rpc("bilan_future_route", { p_module: moduleId });
    if (error) { console.error("[BilanFuture] route", error.code); return "legacy"; }
    return data === "future" ? "future" : "legacy";
  } catch { return "legacy"; }
}

/** Question card with the original exercise presentation (badge, rich text, image size, square boxes). */
function CarteQuestion({ q, numero, selection, onToggle, disabled, correct, montrer }: {
  q: Q; numero: number; selection: string[]; onToggle: (lettre: string, on: boolean) => void; disabled: boolean;
  correct?: string[]; montrer: boolean;
}) {
  const fausse = montrer && !!correct && correct.length > 0 && !reponseExacte(selection, correct);
  return (
    <div data-learner-question data-question-faute={fausse ? "1" : undefined}
      className={`space-y-2 p-4 border rounded-lg bg-card ${fausse ? "border-destructive border-4 bg-destructive/10" : ""}`}>
      <p className="learner-question-title font-medium whitespace-pre-line">
        <span className="inline-flex items-center justify-center bg-primary/10 text-primary text-xs font-bold rounded px-1.5 py-0.5 mr-1.5">Q{numero}</span>
        <RichText value={q.enonce} />
      </p>
      {q.image && (
        <ExamQuestionImage image={q.image} alt={`Illustration question ${numero}`}
          className={`${IMAGE_SIZES[q.imageSize ?? "sm"] ?? "max-h-40"} rounded border object-contain ml-2`}
          fallbackClassName="ml-2 text-xs text-muted-foreground italic" />
      )}
      <p className="text-xs text-muted-foreground italic ml-2">⚠️ Plusieurs réponses possibles</p>
      <div className="space-y-1.5 ml-2">
        {q.choix.map(c => {
          const coche = selection.includes(c.lettre);
          const bonne = montrer && !!correct?.includes(c.lettre);
          let bg = "bg-background hover:bg-muted/50 border";
          if (coche && !montrer) bg = "bg-primary/10 border-primary border-2";
          if (bonne) bg = "bg-emerald-50 border-emerald-500 border-2 dark:bg-emerald-950";
          if (montrer && coche && !bonne) bg = "bg-destructive/10 border-destructive border-2";
          return (
            <label key={c.lettre} data-choix={c.lettre} data-bonne={bonne ? "1" : undefined} data-cochee={coche ? "1" : undefined}
              className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${disabled ? "" : "cursor-pointer"} ${bg}`}>
              <Checkbox checked={coche} disabled={disabled} onCheckedChange={v => onToggle(c.lettre, v === true)} aria-label={`Q${numero} choix ${c.lettre}`} />
              <span className="text-sm"><strong>{c.lettre}.</strong> <RichText value={c.texte} /></span>
              {montrer && coche && <span className="ml-auto text-xs font-semibold shrink-0">Votre réponse</span>}
              {bonne && <CheckCircle2 className={`w-4 h-4 text-emerald-600 shrink-0 ${coche ? "" : "ml-auto"}`} />}
            </label>
          );
        })}
      </div>
      {montrer && correct && (
        <p className="text-sm ml-2" data-testid="corrige-question">
          {correct.length === 0 ? "Corrigé non disponible pour cette question."
            : <>Bonne(s) réponse(s) : <strong>{correct.join(", ")}</strong>{fausse ? ` — votre réponse : ${selection.length ? selection.join(", ") : "aucune"}` : " — réponse exacte"}</>}
        </p>
      )}
    </div>
  );
}

/** Same card form as the Examen Blanc "Résultats par matière" (Coeff., Barème, Éliminatoire, x / 20). */
export function CarteNoteMatiere({ n, index, total, nom }: { n: NoteMatiere; index: number; total: number; nom: string }) {
  const couleur = n.seuilInconnu ? "#F4A227" : n.admis ? "#00B4D8" : "#ef4444";
  return (
    <div className="border-l-4 rounded-lg border overflow-hidden" style={{ borderLeftColor: couleur }} data-testid="bilan-note-matiere">
      <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: "#0D2540" }}>
        <span className="text-xs font-semibold text-white">Matière {index + 1}/{total}</span>
        <span className="text-xs font-medium" style={{ color: "#00B4D8" }}>— Coeff. {n.coefficient}</span>
        {!n.admis && !n.seuilInconnu && <span className="text-xs font-semibold text-red-400 ml-auto">⚠ Note éliminatoire</span>}
        {n.seuilInconnu && <span className="text-xs font-semibold text-amber-400 ml-auto">⚠ Seuil introuvable</span>}
      </div>
      <div className="py-3 px-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: "#0D2540" }}>{nom}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">Barème : {n.maxPoints} pts ({n.ptsQcm} pt{n.ptsQcm > 1 ? "s" : ""} par QCM)</span>
            {n.seuil != null && <span className="text-xs text-muted-foreground">{"Éliminatoire < "}{n.seuil}/20</span>}
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold" style={{ color: couleur }}>{n.noteSur20.toFixed(1)} / 20</span>
          <p className="text-xs text-muted-foreground">{n.points} / {n.maxPoints} pts</p>
        </div>
      </div>
    </div>
  );
}

export function BilanFutureExam({ moduleId, ownerId }: { moduleId: 5 | 11; ownerId: string }) {
  const base = moduleId === 5 ? 500 : 600;
  const [statuts, setStatuts] = useState<Record<number, { submitted: boolean; score?: string; correct?: number; total?: number } | "erreur" | undefined>>({});
  const [bareme, setBareme] = useState<BaremeMatiere[] | null | "erreur">(null);
  useEffect(() => {
    let annule = false;
    fetchLiveExamens().then(ex => { if (!annule) setBareme(baremeReference(ex, moduleId) ?? "erreur"); }).catch(() => { if (!annule) setBareme("erreur"); });
    return () => { annule = true; };
  }, [moduleId]);
  const noteDe = (k: number, correct?: number, total?: number): NoteMatiere | null =>
    bareme && bareme !== "erreur" && correct != null && total ? noterMatiere(bareme[k], correct, total) : null;
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [fautesSeules, setFautesSeules] = useState(false);
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
      s[r.exercise_id] = sub ? { submitted: true, score: `${sub.correct_count}/${sub.question_count}`, correct: sub.correct_count, total: sub.question_count } : { submitted: false };
    }
    setStatuts(s);
  }, [ownerId, moduleId]);
  useEffect(() => { void chargerStatuts(); }, [chargerStatuts]);

  const chargerCorrection = useCallback(async (receipt: FutureReceipt) => {
    const { data, error } = await rpc("bilan_future_correction", { p_receipt: receipt.passageId });
    const c = error ? null : lireCorrection(data, receipt.passageId, receipt.versionId);
    if (!c) { setErreur("Matière remise, mais la correction n'a pas pu être lue. Rechargez la page."); return; }
    setCorrection(c);
  }, []);

  const flush = useCallback(async (receipt: FutureReceipt) => {
    if (flushing.current) return; flushing.current = true;
    try {
      const res = await flushQueue(localStorage, receipt, (a) => rpc("bilan_future_save_draft", a));
      setEnAttente(res.pending);
      if (res.rejected.length) setErreur("Une réponse a été refusée par le serveur (onglet ancien ou passage remis). Rechargez la page.");
    } finally { flushing.current = false; }
  }, []);

  const ouvrir = async (exo: number) => {
    setErreur(null); setPassage(null); setCorrection(null); setRevision(null); setFautesSeules(false); setOuvert(exo);
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
    if (sub) void chargerCorrection(receipt); else void flush(receipt);
  };

  const cocher = (q: Q, lettre: string, on: boolean) => {
    if (!passage || passage.submitted) return;
    const k = String(q.id);
    const cur = passage.answers[k] ?? [];
    const answer = (on ? [...new Set([...cur, lettre])] : cur.filter(x => x !== lettre)).sort();
    const rev = (passage.revisions[k] ?? 0) + 1;
    enqueueDraft(localStorage, passage.receipt, { questionId: q.id, revision: rev, answer, token: crypto.randomUUID() });
    setPassage({ ...passage, answers: { ...passage.answers, [k]: answer }, revisions: { ...passage.revisions, [k]: rev } });
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
    void chargerCorrection(passage.receipt);
    void chargerStatuts();
  };

  if (ouvert !== null) {
    const nom = FUTURE_SUBJECT_NAMES[ouvert - base];
    const corr = new Map((correction?.questions ?? []).map(c => [c.id, c]));
    const fausses = correction ? questionsFausses(correction) : [];
    const enRevision = !!revision;
    const visibles = !passage ? [] : enRevision ? passage.questions.filter(q => revision!.ids.includes(q.id))
      : fautesSeules ? passage.questions.filter(q => fausses.includes(q.id)) : passage.questions;
    const bonnesRevision = revision?.validee ? revision.ids.filter(id => reponseExacte(revision.answers[id], corr.get(id)?.correct)).length : 0;
    return (
      <div className="mx-auto max-w-[1400px] p-4 space-y-4" data-testid="bilan-future-passage">
        <Button variant="outline" onClick={() => { setOuvert(null); setPassage(null); setCorrection(null); setRevision(null); setErreur(null); void chargerStatuts(); }}>← Retour aux matières</Button>
        <h2 className="text-2xl font-bold">{nom}</h2>
        {erreur && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">{erreur}</div>}
        {!passage && !erreur && <p className="text-muted-foreground">Chargement de votre passage…</p>}
        {passage?.submitted && !enRevision && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3" data-testid="bilan-future-resultat">
            <p className="font-semibold">Matière remise : {passage.submitted.correct_count}/{passage.submitted.question_count} bonnes réponses.</p>
            {(() => { const n = noteDe(ouvert - base, passage.submitted.correct_count, passage.submitted.question_count);
              return n ? <CarteNoteMatiere n={n} index={ouvert - base} total={5} nom={n.matiere.nom} />
                : bareme === "erreur" ? <p className="text-sm text-muted-foreground">Barème de l'examen blanc n°1 indisponible : note /20 non affichée.</p> : null; })()}
            {correction && (
              <div className="flex flex-wrap gap-2">
                {fausses.length > 0 ? (
                  <>
                    <Button onClick={() => setRevision({ ids: fausses, answers: {}, validee: false })} data-testid="refaire-fausses">
                      🎯 Refaire uniquement les questions fausses ({fausses.length} questions)
                    </Button>
                    <Button variant="outline" onClick={() => setFautesSeules(v => !v)}>
                      {fautesSeules ? "Voir toute la correction" : `Voir seulement mes erreurs (${fausses.length})`}
                    </Button>
                  </>
                ) : <p className="text-sm">Toutes vos réponses sont exactes.</p>}
              </div>
            )}
            {correction && <p className="text-xs text-muted-foreground">Correction de votre passage remis : vos réponses enregistrées et les bonnes réponses sont surlignées ci-dessous.</p>}
          </div>
        )}
        {enRevision && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-2" data-testid="bilan-future-revision">
            <p className="font-semibold">Révision des questions fausses ({revision!.ids.length}) — entraînement : votre note et votre copie remise ne changent pas.</p>
            {revision!.validee && <p data-testid="revision-score">Révision : {bonnesRevision}/{revision!.ids.length} bonnes réponses.</p>}
            <Button variant="outline" onClick={() => setRevision(null)}>← Retour à la correction</Button>
          </div>
        )}
        {passage && visibles.map(q => {
          const i = passage.questions.indexOf(q);
          const c = corr.get(q.id);
          const showSupport = q.support && (enRevision || fautesSeules || i === 0 || passage.questions[i - 1]?.support?.numero !== q.support.numero);
          return (
            <section key={q.id} className="space-y-3" data-question-id={q.id}>
              {showSupport && q.support && (
                <div className="border-y py-6 space-y-4" data-support-number={q.support.numero}>
                  <h3 className="text-xl font-bold">Texte {q.support.numero}</h3>
                  {q.support.paragraphes.map((p, n) => <p key={n} className="whitespace-pre-wrap leading-relaxed">{p}</p>)}
                </div>
              )}
              {enRevision ? (
                <CarteQuestion q={q} numero={i + 1} selection={revision!.answers[q.id] ?? []} disabled={revision!.validee}
                  correct={c?.correct} montrer={revision!.validee}
                  onToggle={(l, on) => setRevision(r => {
                    if (!r || r.validee) return r;
                    const cur = r.answers[q.id] ?? [];
                    return { ...r, answers: { ...r.answers, [q.id]: (on ? [...new Set([...cur, l])] : cur.filter(x => x !== l)).sort() } };
                  })} />
              ) : (
                <CarteQuestion q={q} numero={i + 1}
                  selection={passage.submitted && c ? c.answer : (passage.answers[q.id] ?? [])}
                  disabled={!!passage.submitted} correct={c?.correct} montrer={!!passage.submitted && !!c}
                  onToggle={(l, on) => cocher(q, l, on)} />
              )}
            </section>
          );
        })}
        {enRevision && !revision!.validee && (
          <Button onClick={() => {
            const manque = revision!.ids.filter(id => !(revision!.answers[id]?.length)).length;
            if (manque) { setErreur(`Il reste ${manque} question(s) sans réponse dans la révision.`); return; }
            setErreur(null); setRevision({ ...revision!, validee: true });
          }}>Corriger ma révision</Button>
        )}
        {enRevision && revision!.validee && (
          <Button variant="outline" onClick={() => setRevision({ ids: revision!.ids, answers: {}, validee: false })}>Recommencer la révision</Button>
        )}
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
      {bareme && bareme !== "erreur" && (() => {
        const notes = FUTURE_SUBJECT_NAMES.map((_, k) => { const s = statuts[base + k]; return s && s !== "erreur" && s.submitted ? noteDe(k, s.correct, s.total) : null; });
        if (!notes.some(Boolean)) return null;
        const m = moyenneBilan(bareme, notes);
        return (
          <div className="space-y-3" data-testid="bilan-bareme-eb1">
            <p className="text-sm text-muted-foreground">Barème identique à l'examen blanc n°1 ({examenReferenceBilan(moduleId)}) : mêmes coefficients, points par QCM et notes éliminatoires.</p>
            {notes.map((n, k) => n && <CarteNoteMatiere key={k} n={n} index={k} total={5} nom={n.matiere.nom} />)}
            <div className="rounded-lg border p-4" data-testid="bilan-moyenne">
              <p className="font-semibold">Moyenne pondérée : {m.moyenne.toFixed(1)} / 20 ({m.matieresPassees}/{m.matieresTotal} matières remises)</p>
              <p className="text-sm">{m.verdict === "reussi" ? "Admis : moyenne ≥ 10 et aucune note éliminatoire."
                : m.verdict === "echoue" ? (m.eliminatoires.length ? `Échec : note éliminatoire en ${m.eliminatoires.join(", ")}.` : "Échec : moyenne inférieure à 10.")
                : m.verdict === "incomplet" ? "Résultat définitif quand les 5 matières sont remises." : "Résultat indéterminé : seuil introuvable."}</p>
            </div>
          </div>
        );
      })()}
      {FUTURE_SUBJECT_NAMES.map((nom, k) => {
        const s = statuts[base + k];
        return (
          <Button key={k} variant="outline" onClick={() => void ouvrir(base + k)} className="w-full h-auto justify-start text-left rounded-lg p-4 whitespace-normal">
            <span className="text-lg font-semibold">{nom}</span>
            <span className="ml-3 text-sm text-muted-foreground">
              {s && s !== "erreur" ? (s.submitted ? `Remise — ${s.score}` : "En cours") : "À commencer"}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
