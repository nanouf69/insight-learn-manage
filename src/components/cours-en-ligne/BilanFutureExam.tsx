/**
 * Learner screen for the versioned future Bilan examen (modules 5 VTC / 11 TAXI).
 * Only rendered when the server route says 'future'. Reads a key-free projection,
 * writes only through receipt+version scoped RPCs; never touches legacy module_X_exo_Y data.
 * After submission: read-only correction (bilan_future_correction) and a local-only
 * review of the wrong questions of this passage (never saved, never changes the submission).
 * Presentation = the shared classic quiz components (learnerQuizUi), same as every other module.
 */
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, Calculator, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExamQuestionImage } from "./ExamQuestionImage";
import Calculatrice from "./Calculatrice";
import {
  ExerciseQuestionPrompt, QcmChoiceButtons, QuizQuestionSidebar, QuizScoreSummary, QuizAnswerGrid, flashQuestionAnchor,
  QuizResultPanels, WrongAnswersReviewDialog, RevisionModeBanner, ProgressionStep, ProgressionBar, AnswersCompletionStrip,
  QuizPageNavigation, QUESTION_IMAGE_SIZES,
} from "./learnerQuizUi";
import { enqueueDraft, flushQueue, readQueue } from "@/lib/bilanFutureTransport";
import type { FutureReceipt } from "@/lib/bilanFutureVersion";
import { lireCorrection, questionsFausses, reponseExacte, type Correction } from "@/lib/bilanFutureCorrection";
import { baremeReference, examenReferenceBilan, moyenneBilan, noterMatiere, type BaremeMatiere, type NoteMatiere } from "@/lib/bilanFutureBareme";
import { fetchLiveExamens } from "./useLiveExamens";
import { RevisionCopieCorrigee } from "./RevisionCopieCorrigee";
import { BilanSrTraining } from "./BilanSrTraining";
import { BILAN_SR_TRAINING_ACTIF } from "@/lib/bilanSrTraining";

import { BilanMatiereSteps, BilanMatiereCard, BilanQuestionCard, BilanRemiseSummary, BilanRemisesRecap, NOMS_MATIERES_BILAN } from "./BilanFuturePresentation";
export const FUTURE_SUBJECT_NAMES = NOMS_MATIERES_BILAN;

type Q = { id: number; enonce: string; image?: string; imageSize?: string; support?: { numero: number; paragraphes: string[] }; choix: { lettre: string; texte: string }[] };
type Passage = { receipt: FutureReceipt; questions: Q[]; answers: Record<string, string[]>; revisions: Record<string, number>; submitted: { correct_count: number; question_count: number } | null };
type Revision = { ids: number[]; answers: Record<string, string[]>; validee: boolean };

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

type Statut = { submitted: boolean; score?: string; correct?: number; total?: number };

/** Classic exercise prompt data: the reading support is shown in the same passage box as other modules. */
const promptDe = (q: Q) => q.support
  ? { question: q.enonce, passageTitle: `Texte ${q.support.numero}`, passageBody: q.support.paragraphes.join("\n\n") }
  : { question: q.enonce };

function MatiereCard({ children, moduleId, nom, onCalculator }: { children: ReactNode; moduleId: number; nom: string; onCalculator: () => void }) {
  const tools = <div className="flex items-center gap-2 flex-wrap"><Button size="sm" variant="outline" onClick={onCalculator} className="gap-1"><Calculator className="w-4 h-4" />Calculatrice</Button></div>;
  return moduleId === 5 ? <BilanMatiereCard nom={nom} tools={tools}>{children}</BilanMatiereCard> : <Card className="scroll-mt-4 transition-all"><CardContent className="p-6 space-y-4"><div className="flex items-center justify-between gap-2 flex-wrap"><h3 className="text-lg font-bold">📝 {nom}</h3>{tools}</div>{children}</CardContent></Card>;
}

export function BilanFutureExam({ moduleId, ownerId, apprenantId, titre, description, onBack }: {
  moduleId: 5 | 11; ownerId: string; apprenantId?: string; titre?: string; description?: string; onBack?: () => void;
}) {
  const base = moduleId === 5 ? 500 : 600;
  const [statuts, setStatuts] = useState<Record<number, Statut | undefined>>({});
  const [statutsLus, setStatutsLus] = useState(false);
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
  const [relecture, setRelecture] = useState(false);
  const [nonRepondues, setNonRepondues] = useState<Set<number>>(new Set());
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [enAttente, setEnAttente] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [mobileProgressOpen, setMobileProgressOpen] = useState(false);
  const flushing = useRef(false);
  const ouvertureAuto = useRef(false);
  // Only the latest opened matière may update the screen (fast page changes never mix two passages).
  const ouvertureCourante = useRef(0);

  const chargerStatuts = useCallback(async () => {
    const { data, error } = await (supabase as any).from("bilan_future_receipts")
      .select("id, exercise_id, bilan_future_submissions(correct_count, question_count)")
      .eq("owner_id", ownerId).eq("module_id", moduleId);
    if (error) { setErreur("Lecture de vos matières impossible. Rechargez la page."); setStatutsLus(true); return; }
    const s: Record<number, Statut> = {};
    for (const r of data ?? []) {
      const sub = Array.isArray(r.bilan_future_submissions) ? r.bilan_future_submissions[0] : r.bilan_future_submissions;
      s[r.exercise_id] = sub ? { submitted: true, score: `${sub.correct_count}/${sub.question_count}`, correct: sub.correct_count, total: sub.question_count } : { submitted: false };
    }
    setStatuts(s);
    setStatutsLus(true);
  }, [ownerId, moduleId]);
  useEffect(() => { void chargerStatuts(); }, [chargerStatuts]);

  const chargerCorrection = useCallback(async (receipt: FutureReceipt, tok?: number) => {
    const { data, error } = await rpc("bilan_future_correction", { p_receipt: receipt.passageId });
    if (tok !== undefined && tok !== ouvertureCourante.current) return;
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

  const ouvrir = useCallback(async (exo: number) => {
    const tok = ++ouvertureCourante.current;
    const actuel = () => tok === ouvertureCourante.current;
    setErreur(null); setPassage(null); setCorrection(null); setRevision(null); setRelecture(false); setNonRepondues(new Set()); setOuvert(exo);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
    const o = await rpc("bilan_future_open", { p_module: moduleId, p_exercise: exo });
    if (!actuel()) return;
    if (o.error || !o.data?.id) { setErreur("Ouverture de la matière impossible. Rechargez la page."); return; }
    const receipt: FutureReceipt = { passageId: o.data.id, versionId: o.data.version_id, moduleId, exerciseId: exo, ownerId };
    const [qs, rs] = await Promise.all([rpc("bilan_future_questions", { p_receipt: receipt.passageId }), rpc("bilan_future_resume", { p_receipt: receipt.passageId })]);
    if (!actuel()) return;
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
    if (!actuel()) return;
    setPassage({ receipt, questions: qs.data.questions ?? [], answers, revisions, submitted: sub });
    if (sub) void chargerCorrection(receipt, tok); else void flush(receipt);
  }, [moduleId, ownerId, chargerCorrection, flush]);

  // Like every module, the learner lands directly on a quiz page: the first matière not yet handed in.
  useEffect(() => {
    if (!statutsLus || ouvertureAuto.current) return;
    if (ouvertureCourante.current > 0) { ouvertureAuto.current = true; return; } // learner already chose a page
    ouvertureAuto.current = true;
    const k = FUTURE_SUBJECT_NAMES.findIndex((_, i) => !statuts[base + i]?.submitted);
    void ouvrir(base + (k < 0 ? 0 : k));
  }, [statutsLus, statuts, base, ouvrir]);

  const cocher = (q: Q, lettre: string) => {
    if (!passage || passage.submitted) return;
    const k = String(q.id);
    const cur = passage.answers[k] ?? [];
    const answer = (cur.includes(lettre) ? cur.filter(x => x !== lettre) : [...new Set([...cur, lettre])]).sort();
    const rev = (passage.revisions[k] ?? 0) + 1;
    enqueueDraft(localStorage, passage.receipt, { questionId: q.id, revision: rev, answer, token: crypto.randomUUID() });
    setPassage({ ...passage, answers: { ...passage.answers, [k]: answer }, revisions: { ...passage.revisions, [k]: rev } });
    setNonRepondues(prev => { if (!prev.has(q.id)) return prev; const n = new Set(prev); n.delete(q.id); return n; });
    void flush(passage.receipt);
  };

  const remettre = async () => {
    if (!passage) return;
    const manquantes = passage.questions.filter(q => !(passage.answers[q.id]?.length));
    if (manquantes.length) {
      setNonRepondues(new Set(manquantes.map(q => q.id)));
      setErreur(`Il reste ${manquantes.length} question(s) sans réponse.`);
      toast.error("Répondez à toutes les questions QCM avant de valider");
      const idx = passage.questions.indexOf(manquantes[0]);
      setTimeout(() => document.getElementById(`exo-q-${passage.receipt.exerciseId}-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      return;
    }
    if (!window.confirm("Remettre définitivement cette matière ? Vous ne pourrez plus modifier vos réponses.")) return;
    const tok = ouvertureCourante.current;
    setEnvoi(true); setErreur(null); setNonRepondues(new Set());
    await flush(passage.receipt);
    const ans = Object.fromEntries(passage.questions.map(q => [String(q.id), passage.answers[q.id]]));
    const { data, error } = await rpc("bilan_future_submit", { p_receipt: passage.receipt.passageId, p_answers: ans });
    setEnvoi(false);
    if (error) { setErreur("La remise n'a pas été enregistrée. Vos réponses sont conservées ; réessayez."); return; }
    // Validation only after the server acknowledgement + readback.
    const back = await (supabase as any).from("bilan_future_submissions").select("correct_count, question_count").eq("receipt_id", passage.receipt.passageId).maybeSingle();
    if (back.error || !back.data || back.data.correct_count !== data.correct_count) { setErreur("Remise envoyée mais non relue. Rechargez la page pour vérifier."); return; }
    void chargerStatuts();
    if (tok !== ouvertureCourante.current) return;
    setPassage({ ...passage, submitted: back.data });
    toast.success("✅ Quiz validé ! Consultez vos résultats puis cliquez sur Suivant.");
    void chargerCorrection(passage.receipt, tok);
  };

  const pageCourante = ouvert === null ? 0 : ouvert - base;
  const total = FUTURE_SUBJECT_NAMES.length;
  const remises = FUTURE_SUBJECT_NAMES.filter((_, k) => statuts[base + k]?.submitted).length;
  const progressPercent = Math.round((remises / total) * 100);
  const allerA = (k: number) => { if (k >= 0 && k < total && base + k !== ouvert) void ouvrir(base + k); };

  const renderProgressionSteps = (isMobileView = false) => (
    <div className={isMobileView ? "space-y-1" : "space-y-1.5"}>
      {moduleId === 5 ? <BilanMatiereSteps current={pageCourante} submitted={FUTURE_SUBJECT_NAMES.map((_, i) => !!statuts[base + i]?.submitted)} onSelect={i => { allerA(i); if (isMobileView) setMobileProgressOpen(false); }} /> : FUTURE_SUBJECT_NAMES.map((nom, i) => (
        <ProgressionStep key={i} label={`📝 Quiz — ${nom}`} current={i === pageCourante} completed={!!statuts[base + i]?.submitted} unlocked isLast={i >= total - 1} badge="quiz" onClick={() => { allerA(i); if (isMobileView) setMobileProgressOpen(false); }} />
      ))}
    </div>
  );
  const renderProgressBar = () => (
    <ProgressionBar percent={progressPercent} legend={
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
          {statutsLus ? `${remises}/${total} quiz` : "Chargement…"}
        </span>
      </div>
    } />
  );

  const nom = FUTURE_SUBJECT_NAMES[pageCourante];
  const corr = new Map((correction?.questions ?? []).map(c => [c.id, c]));
  const fausses = correction ? questionsFausses(correction) : [];
  const enRevision = !!revision;
  const soumis = !!passage?.submitted;
  const questions = passage?.questions ?? [];
  const exoId = ouvert ?? base;
  const anchor = (qi: number) => `exo-q-${exoId}-${qi}`;
  const reponseAffichee = (q: Q): string[] => enRevision && revision!.ids.includes(q.id) ? (revision!.answers[q.id] ?? [])
    : soumis ? (corr.get(q.id)?.answer ?? passage!.answers[q.id] ?? []) : (passage?.answers[q.id] ?? []);
  const resultatsVisibles = enRevision ? revision!.validee : soumis && !!correction;
  const estFausse = (q: Q) => {
    const c = corr.get(q.id);
    if (!c || c.correct.length === 0) return false;
    const sel = reponseAffichee(q);
    if (enRevision) return revision!.ids.includes(q.id) && (revision!.validee || sel.length > 0) && !reponseExacte(sel, c.correct);
    return resultatsVisibles && !reponseExacte(sel, c.correct);
  };
  const visibles = enRevision ? questions.filter(q => revision!.ids.includes(q.id)) : questions;
  const faussesRevision = revision?.validee ? revision.ids.filter(id => !reponseExacte(revision.answers[id], corr.get(id)?.correct)) : [];
  const bonnesRevision = revision?.validee ? revision.ids.length - faussesRevision.length : 0;
  const reponduesCompte = questions.filter(q => reponseAffichee(q).length > 0).length;
  const relireItems = (ids: number[]) => questions.filter(q => ids.includes(q.id)).map(q => {
    const learner = reponseAffichee(q);
    const c = corr.get(q.id);
    return {
      id: q.id, enonce: q.enonce, isQrc: false, explication: c?.explication ?? undefined,
      learnerText: learner.length > 0 ? learner.map(l => `${l}. ${q.choix.find(ch => ch.lettre === l)?.texte ?? ""}`).join(" | ") : "(sans réponse)",
      expectedText: q.choix.filter(ch => c?.correct.includes(ch.lettre)).map(ch => `${ch.lettre}. ${ch.texte ?? ""}`).join(" | "),
    };
  });
  const idsARelire = enRevision ? faussesRevision : fausses;
  const demarrerRevision = () => {
    setRelecture(false);
    setRevision({ ids: idsARelire, answers: {}, validee: false });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const boutonSuivantOuFin = pageCourante < total - 1 ? (
    <Button onClick={() => allerA(pageCourante + 1)} disabled={!soumis} className="gap-2" title={!soumis ? "Validez le quiz avant de continuer" : ""}>
      {!soumis && <span>🔒</span>}
      Suivant <ArrowDown className="w-4 h-4 -rotate-90" />
    </Button>
  ) : (
    <Button variant="secondary" className="gap-2" disabled={remises < total || !onBack} onClick={() => onBack?.()}>
      <CheckCircle2 className="w-4 h-4" />
      Terminé
    </Button>
  );

  const notesBilan = bareme && bareme !== "erreur"
    ? FUTURE_SUBJECT_NAMES.map((_, k) => { const s = statuts[base + k]; return s?.submitted ? noteDe(k, s.correct, s.total) : null; })
    : null;

  return (
    <>
    <div className="flex gap-4 lg:gap-6 max-w-[1760px] mx-auto" data-testid="bilan-future-matieres">
      {/* Vertical progress sidebar — desktop */}
      <div className="hidden md:block shrink-0 w-48 lg:w-56 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="rounded-xl border bg-card shadow-sm p-5 space-y-2">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Progression</h3>
          {renderProgressionSteps()}
          {renderProgressBar()}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        <div className="space-y-3">
          {(titre || description) && (
            <div className="text-center space-y-1">
              {titre && <h2 className="text-2xl font-bold">{titre}</h2>}
              {description && <p className="text-muted-foreground text-sm">{description}</p>}
            </div>
          )}
          {notesBilan && notesBilan.some(Boolean) && (() => {
            const m = moyenneBilan(bareme as BaremeMatiere[], notesBilan);
            return (
              <div className="space-y-3" data-testid="bilan-bareme-eb1">
                <p className="text-sm text-muted-foreground">Barème identique à l'examen blanc n°1 ({examenReferenceBilan(moduleId)}) : mêmes coefficients, points par QCM et notes éliminatoires.</p>
                <div className="rounded-lg border p-4" data-testid="bilan-moyenne">
                  <p className="font-semibold">Moyenne pondérée : {m.moyenne.toFixed(1)} / 20 ({m.matieresPassees}/{m.matieresTotal} matières remises)</p>
                  <p className="text-sm">{m.verdict === "reussi" ? "Admis : moyenne ≥ 10 et aucune note éliminatoire."
                    : m.verdict === "echoue" ? (m.eliminatoires.length ? `Échec : note éliminatoire en ${m.eliminatoires.join(", ")}.` : "Échec : moyenne inférieure à 10.")
                    : m.verdict === "incomplet" ? "Résultat définitif quand les 5 matières sont remises." : "Résultat indéterminé : seuil introuvable."}</p>
                </div>
              </div>
            );
          })()}

          {/* Mobile/tablet collapsible progression */}
          {moduleId===5 && <BilanRemisesRecap matieres={FUTURE_SUBJECT_NAMES.map((_,i)=>statutsLus ? statuts[base+i] ?? {submitted:false} : undefined)} />}
          <div className="md:hidden">
            <button
              onClick={() => setMobileProgressOpen(!mobileProgressOpen)}
              className="w-full flex items-center justify-between rounded-xl border bg-card shadow-sm px-4 py-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">{progressPercent}%</span>
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-foreground">Progression</span>
                    <span className="text-xs text-muted-foreground block">
                      📝 Exercices — {pageCourante + 1}/{total}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {mobileProgressOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
              </div>
            </button>
            {mobileProgressOpen && (
              <div className="mt-2 rounded-xl border bg-card shadow-sm p-4 animate-fade-in max-h-[60vh] overflow-y-auto">
                {renderProgressionSteps(true)}
                {renderProgressBar()}
              </div>
            )}
          </div>
        </div>

        {/* Current page content */}
        <div className="animate-fade-in">
          <div className="grid grid-cols-[minmax(0,1fr)_64px] sm:grid-cols-[minmax(0,1fr)_88px] gap-3 sm:gap-4" data-testid="bilan-future-passage">
            <div className="space-y-4 min-w-0">
              <MatiereCard moduleId={moduleId} nom={nom} onCalculator={() => setShowCalculator(v => !v)}>
                  {erreur && <div role="alert" className="w-full rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-center">{erreur}</div>}
                  {!passage && !erreur && <p className="text-muted-foreground">Chargement de votre passage…</p>}
                  {enRevision && (
                    <div data-testid="bilan-future-revision" className="space-y-2">
                      <RevisionModeBanner count={revision!.ids.length} onShowAll={() => setRevision(null)} />
                      <p className="text-xs text-muted-foreground">Entraînement : votre note et votre copie remise ne changent pas.</p>
                    </div>
                  )}
                  {visibles.map(q => {
                    const qi = questions.indexOf(q);
                    const c = corr.get(q.id);
                    const fausse = estFausse(q);
                    const sizeClass = QUESTION_IMAGE_SIZES[q.imageSize ?? "sm"] ?? "max-h-40";
                    if (moduleId === 5) return <BilanQuestionCard key={q.id} question={q} index={qi} anchor={anchor(qi)} selected={reponseAffichee(q)} disabled={enRevision ? revision?.validee === true : soumis} showResults={resultatsVisibles} correct={c?.correct} wrong={fausse} missing={nonRepondues.has(q.id)} onSelect={l => {
                      if (enRevision) setRevision(r => { if (!r || r.validee) return r; const cur = r.answers[q.id] ?? []; return { ...r, answers: { ...r.answers, [q.id]: (cur.includes(l) ? cur.filter(x => x !== l) : [...cur, l]).sort() } }; });
                      else cocher(q, l);
                    }} />;
                    return (
                      <div key={q.id} id={anchor(qi)} data-learner-question data-answer-scroll-anchor data-question-id={q.id}
                        data-question-faute={fausse ? "1" : undefined}
                        className={`space-y-2 p-4 border rounded-lg scroll-mt-20 transition-all ${fausse ? 'border-destructive border-4 bg-destructive/10' : nonRepondues.has(q.id) ? 'border-destructive border-2 bg-destructive/5' : ''}`}>
                        <ExerciseQuestionPrompt questionNumber={qi + 1} prompt={promptDe(q)} />
                        {q.image && (
                          <ExamQuestionImage image={q.image} alt="Illustration" className={`${sizeClass} rounded border object-contain ml-2`} fallbackClassName="ml-2 text-xs text-muted-foreground italic" />
                        )}
                        <p className="text-xs text-muted-foreground italic ml-2">⚠️ Plusieurs réponses possibles</p>
                        <QcmChoiceButtons
                          choices={q.choix.map(ch => ({ lettre: ch.lettre, texte: ch.texte, correct: resultatsVisibles ? !!c?.correct.includes(ch.lettre) : undefined }))}
                          selected={reponseAffichee(q)}
                          multi
                          showResults={resultatsVisibles}
                          disabled={enRevision ? revision!.validee : soumis}
                          onSelect={(l) => {
                            if (enRevision) {
                              setRevision(r => {
                                if (!r || r.validee) return r;
                                const cur = r.answers[q.id] ?? [];
                                return { ...r, answers: { ...r.answers, [q.id]: (cur.includes(l) ? cur.filter(x => x !== l) : [...cur, l]).sort() } };
                              });
                            } else cocher(q, l);
                          }}
                        />
                      </div>
                    );
                  })}

                  {passage && (
                    <div className="flex justify-center gap-4">
                      {(!soumis || (enRevision && !revision!.validee)) ? (
                        <div className="flex flex-col items-center gap-3 w-full">
                          <Button size="lg" className="gap-2" disabled={envoi} onClick={() => {
                            if (!enRevision) { void remettre(); return; }
                            const manque = revision!.ids.filter(id => !(revision!.answers[id]?.length));
                            if (manque.length) {
                              setNonRepondues(new Set(manque));
                              toast.error("Répondez à toutes les questions QCM avant de valider");
                              return;
                            }
                            setNonRepondues(new Set()); setErreur(null);
                            setRevision({ ...revision!, validee: true });
                          }}>
                            <CheckCircle2 className="w-5 h-5" />
                            {envoi ? "Enregistrement en cours…" : "Valider les QCM"}
                          </Button>
                          {enAttente > 0 && <span className="text-sm text-muted-foreground">{enAttente} réponse(s) en attente d'envoi</span>}
                        </div>
                      ) : (
                        <div className="w-full space-y-5" data-testid={enRevision ? undefined : "bilan-future-resultat"}>
                          {moduleId === 5 && !enRevision ? <BilanRemiseSummary correct={passage.submitted!.correct_count} total={passage.submitted!.question_count} /> : <QuizScoreSummary
                            points={enRevision ? bonnesRevision : passage.submitted!.correct_count}
                            total={enRevision ? revision!.ids.length : passage.submitted!.question_count}
                            footnote={enRevision
                              ? <p className="text-xs text-muted-foreground" data-testid="revision-score">Révision : {bonnesRevision}/{revision!.ids.length} — copie remise inchangée</p>
                              : <p className="text-xs text-muted-foreground">Matière remise : {passage.submitted!.correct_count}/{passage.submitted!.question_count} bonnes réponses</p>} />}
                          {!enRevision && (() => {
                            const n = noteDe(pageCourante, passage.submitted!.correct_count, passage.submitted!.question_count);
                            return n ? <CarteNoteMatiere n={n} index={pageCourante} total={total} nom={n.matiere.nom} />
                              : bareme === "erreur" ? <p className="text-sm text-muted-foreground text-center">Barème de l'examen blanc n°1 indisponible : note /20 non affichée.</p> : null;
                          })()}
                          {correction && (
                            <QuizAnswerGrid
                              items={(enRevision ? visibles : questions).map(q => ({ key: q.id, correct: !estFausse(q) }))}
                              onJump={(i) => flashQuestionAnchor(anchor(questions.indexOf((enRevision ? visibles : questions)[i])))}
                            />
                          )}
                          {!correction && <p className="text-sm text-muted-foreground text-center">Chargement de la correction…</p>}
                          <QuizResultPanels>
                            {BILAN_SR_TRAINING_ACTIF && correction && moduleId === 5 && exoId === 502 ? <BilanSrTraining key={passage.receipt.passageId} sourceType="future" sourceId={passage.receipt.passageId} /> : correction && (
                              <Button variant="outline" size="sm" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50" data-testid="refaire-fausses"
                                onClick={() => {
                                  if (idsARelire.length === 0) { toast.success("🎉 Aucune question fausse à refaire !"); return; }
                                  setRelecture(true);
                                }}>
                                🎯 Refaire les fausses ({idsARelire.length})
                              </Button>
                            )}
                            {pageCourante < total - 1 && (
                              <Button size="sm" className="gap-2" onClick={() => allerA(pageCourante + 1)}>
                                Suivant ➡️
                              </Button>
                            )}
                            {pageCourante === total - 1 && (
                              <Button size="sm" variant="secondary" className="gap-2" disabled={remises < total || !onBack} onClick={() => onBack?.()}>
                                <CheckCircle2 className="w-4 h-4" /> Terminé
                              </Button>
                            )}
                            {onBack && (
                              <Button size="sm" variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/5" onClick={onBack}>
                                🏠 Retour à l'accueil
                              </Button>
                            )}
                          </QuizResultPanels>
                          {/* Separate persisted revision against the current official key; the local review above is unchanged. */}
                          {correction && apprenantId && <RevisionCopieCorrigee owner={apprenantId} copies={[{ type: "bilan_future", id: passage.receipt.passageId }]} />}
                          <WrongAnswersReviewDialog open={relecture} onOpenChange={(o) => { if (!o) setRelecture(false); }}
                            items={relecture ? relireItems(idsARelire) : []} onConfirm={demarrerRevision} />
                        </div>
                      )}
                    </div>
                  )}
              </MatiereCard>
            </div>
            <QuizQuestionSidebar
              onJump={(qi) => document.getElementById(anchor(qi))?.scrollIntoView({ behavior: "smooth", block: "start" })}
              items={questions.map(q => ({ key: q.id, answered: reponseAffichee(q).length > 0, wrong: estFausse(q) }))}
            />
          </div>
        </div>

        <AnswersCompletionStrip answered={reponduesCompte} total={questions.length} />

        <QuizPageNavigation onPrev={() => allerA(pageCourante - 1)} prevDisabled={pageCourante === 0} current={pageCourante} total={total}>
          {boutonSuivantOuFin}
        </QuizPageNavigation>
      </div>
    </div>
    {showCalculator && <Calculatrice onClose={() => setShowCalculator(false)} />}
    </>
  );
}
