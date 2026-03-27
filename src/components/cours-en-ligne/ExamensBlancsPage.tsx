// Re-export all sub-components and utilities for backward compatibility
// This file was split from the original monolithic ExamensBlancsPage.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Loader2, RotateCcw, CheckCircle2 } from "lucide-react";
import { tousLesExamens, getPointsParQuestion, type ExamenBlanc, type Matiere, type Question } from "./examens-blancs-data";
import { loadSavedExamens, EXAMEN_BLANC_MODULE_BASE, getModuleIdForExamId } from "./ExamensBlancsEditor";
import ExamensBlancsEditor from "./ExamensBlancsEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Timer, ArrowRight } from "lucide-react";

import type { ResultatMatiere, Reponses } from "./examens-blancs-types";
import {
  safeStr, safeArray, toFiniteNumber, toTimestamp, clamp,
  normalizeNoteSur20, logSecurityImageDebug,
  evaluateQrcDeterministic, computeAdmisForMatiere,
} from "./examens-blancs-utils";
import { EcranSelection } from "./ExamenBlancsListe";
import { PassageMatiere, TransitionMatiere } from "./ExamenBlancsPassage";
import { EcranResultats, RevisionFausses } from "./ExamenBlancsResultats";

export default function ExamensBlancsPage({
  defaultBilanId,
  onBilanConsumed,
  apprenantId,
  userId,
  apprenantType,
  isAdmin,
  isPresentiel,
  onExamStateChange,
}: {
  defaultBilanId?: string | null;
  onBilanConsumed?: () => void;
  apprenantId?: string | null;
  userId?: string | null;
  apprenantType?: string | null;
  isAdmin?: boolean;
  isPresentiel?: boolean;
  onExamStateChange?: (isInExam: boolean) => void;
} = {}) {
  const EXAM_SESSION_KEY = `exam_session_${apprenantId || "anon"}`;

  const restoreSession = () => {
    try {
      const saved = sessionStorage.getItem(EXAM_SESSION_KEY);
      if (saved) return JSON.parse(saved);
    } catch { }
    return null;
  };

  const savedSession = restoreSession();

  const [phase, setPhase] = useState<"selection" | "intro" | "examen" | "transition" | "resultats" | "edition" | "revision">(
    savedSession?.phase === "examen" ? "examen" : "selection"
  );
  const [examenChoisi, setExamenChoisi] = useState<ExamenBlanc | null>(null);
  const [matiereIndex, setMatiereIndex] = useState(savedSession?.matiereIndex || 0);
  const [tousResultats, setTousResultats] = useState<ResultatMatiere[]>(safeArray<ResultatMatiere>(savedSession?.resultats));
  const [lastMatiereResult, setLastMatiereResult] = useState<ResultatMatiere | null>(null);
  const [isViewingSavedResults, setIsViewingSavedResults] = useState(false);
  const [bilanPrefiltre, setBilanPrefiltre] = useState<string | null>(null);
  const [liveExamens, setLiveExamens] = useState<ExamenBlanc[]>(tousLesExamens);
  const [selectionRefreshKey, setSelectionRefreshKey] = useState(0);
  const [isReloadingQuestions, setIsReloadingQuestions] = useState(false);
  const examStartTimeRef = useRef<number>(savedSession?.examStartTime || Date.now());
  const reloadInFlightRef = useRef<Promise<ExamenBlanc[]> | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [pausedExamIds, setPausedExamIds] = useState<Set<string>>(new Set());

  const handlePauseToggle = useCallback((examId: string) => {
    setPausedExamIds(prev => {
      const next = new Set(prev);
      if (next.has(examId)) {
        next.delete(examId);
        toast.success("Examen repris");
      } else {
        next.add(examId);
        toast.info("Examen mis en pause");
      }
      return next;
    });
  }, []);

  const refreshLiveExamens = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!force && reloadInFlightRef.current) return reloadInFlightRef.current;
    setLoadTimeout(false);
    const timeoutTimer = setTimeout(() => setLoadTimeout(true), 10_000);
    reloadInFlightRef.current = (async () => {
      try {
        const saved = await loadSavedExamens();
        logSecurityImageDebug(saved, force ? "manual-refetch" : "auto-refetch");
        setLiveExamens(saved);
        setExamenChoisi((prev) => {
          if (!prev) return prev;
          return saved.find((exam) => exam.id === prev.id) ?? prev;
        });
        return saved;
      } finally {
        clearTimeout(timeoutTimer);
        setLoadTimeout(false);
      }
    })();
    try { return await reloadInFlightRef.current; }
    finally { reloadInFlightRef.current = null; }
  }, []);

  const handleManualReloadQuestions = async () => {
    setIsReloadingQuestions(true);
    try {
      await refreshLiveExamens({ force: true });
      toast.success("Questions rechargées (réponses conservées).");
    } catch (error) {
      console.error("[ExamImages] Échec rechargement manuel", error);
      toast.error("Impossible de recharger les questions.");
    } finally {
      setIsReloadingQuestions(false);
    }
  };

  const persistExamSession = (p: string, exId: string | null, mi: number, resultats?: ResultatMatiere[]) => {
    try {
      if (p === "examen" && exId) {
        sessionStorage.setItem(EXAM_SESSION_KEY, JSON.stringify({
          phase: p, examenId: exId, matiereIndex: mi,
          examStartTime: examStartTimeRef.current, resultats: resultats || [],
        }));
      } else {
        sessionStorage.removeItem(EXAM_SESSION_KEY);
      }
    } catch { }
  };

  // Restore chosen exam once liveExamens loaded
  const [sessionRestored, setSessionRestored] = useState(false);
  useEffect(() => {
    if (sessionRestored || liveExamens.length === 0) return;
    if (savedSession?.examenId) {
      const found = liveExamens.find(e => e.id === savedSession.examenId);
      if (found) {
        setExamenChoisi(found);
        setPhase("examen");
        setMatiereIndex(savedSession.matiereIndex || 0);
        if (savedSession.resultats?.length) setTousResultats(savedSession.resultats);
      }
    }
    setSessionRestored(true);
  }, [liveExamens, sessionRestored]);

  const isInExam = phase === "examen" || phase === "intro" || phase === "transition";

  useEffect(() => {
    onExamStateChange?.(isInExam);
    return () => { onExamStateChange?.(false); };
  }, [isInExam, onExamStateChange]);

  useEffect(() => {
    if (!isInExam) { void refreshLiveExamens(); }
  }, [refreshLiveExamens, isInExam]);

  // Realtime: targeted update when admin saves exam changes — DISABLED during exam
  useEffect(() => {
    if (isInExam) return;
    const validExamModuleIds = new Set(tousLesExamens.map((ex) => getModuleIdForExamId(ex.id)));
    const isExamModuleEvent = (payload: any) => {
      const moduleId = Number(payload?.new?.module_id ?? payload?.old?.module_id);
      return Number.isFinite(moduleId) && validExamModuleIds.has(moduleId);
    };
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`examens-blancs-live`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'module_editor_state' }, (payload) => {
        if (!isExamModuleEvent(payload)) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log("[Realtime] Exam blanc updated, reloading...");
          try { sessionStorage.removeItem(EXAM_SESSION_KEY); } catch {}
          void refreshLiveExamens();
        }, 5000);
      })
      .subscribe();
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [refreshLiveExamens, EXAM_SESSION_KEY, isInExam]);

  useEffect(() => {
    if (defaultBilanId) { setBilanPrefiltre(defaultBilanId); onBilanConsumed?.(); }
  }, [defaultBilanId]);

  const handleStart = async (examen: ExamenBlanc) => {
    const latestExamen = liveExamens.find((live) => live.id === examen.id) ?? examen;
    if (!isAdmin && apprenantId) {
      const quizType = latestExamen.id.startsWith("bilan-") ? "bilan" : "examen_blanc";
      const { count, error } = await supabase
        .from("apprenant_quiz_results" as any)
        .select("id", { count: "exact", head: true })
        .eq("apprenant_id", apprenantId)
        .eq("quiz_id", latestExamen.id)
        .eq("quiz_type", quizType);
      if (error) { toast.error("Vérification de sécurité impossible. Réessayez."); return; }
      const matieresTotal = Math.max(latestExamen.matieres?.length || 1, 1);
      if ((count ?? 0) >= matieresTotal) { toast.error("Examen déjà réalisé. Demandez une remise à zéro à l'administration."); return; }
    }
    setBilanPrefiltre(null);
    setExamenChoisi(latestExamen);
    setMatiereIndex(0);
    setTousResultats([]);
    setPhase("intro");
  };

  const handleViewResults = async (examen: ExamenBlanc) => {
    if (!apprenantId) return;
    const examReference = liveExamens.find((live) => live.id === examen.id) ?? examen;
    const { data } = await supabase
      .from("apprenant_quiz_results" as any)
      .select("*")
      .eq("apprenant_id", apprenantId)
      .eq("quiz_id", examReference.id)
      .eq("quiz_type", examReference.id.startsWith("bilan-") ? "bilan" : "examen_blanc");
    if (!data || (data as any[]).length === 0) { toast.error("Aucun résultat trouvé pour cet examen."); return; }

    const { pickBestScoreRow, getMatiereCanonicalKey } = await import("./examens-blancs-utils");
    const latestByMatiere = new Map<string, any>();
    (data as any[]).forEach((row: any, idx: number) => {
      const key = row.matiere_id || row.matiere_nom || `unknown-${idx}`;
      const prev = latestByMatiere.get(key);
      const prevTs = prev ? Math.max(toTimestamp(prev.completed_at), toTimestamp(prev.created_at)) : 0;
      const currTs = Math.max(toTimestamp(row.completed_at), toTimestamp(row.created_at));
      if (!prev || currTs >= prevTs) latestByMatiere.set(key, row);
    });

    const latestRows = Array.from(latestByMatiere.values());
    const rowsByMatiereId = new Map(latestRows.filter((r: any) => !!r.matiere_id).map((r: any) => [r.matiere_id, r]));
    const rowsByMatiereNom = new Map(latestRows.filter((r: any) => !!r.matiere_nom).map((r: any) => [r.matiere_nom, r]));

    const calculerMaxPoints = (matiere: Matiere): number => {
      const questionsSafe = (matiere.questions ?? []).filter((q): q is Question => q != null && q?.type != null);
      return questionsSafe.reduce((acc, q) => acc + getPointsParQuestion(matiere.id, q?.type || "QCM", matiere), 0);
    };

    const results = examReference.matieres.map((matiere): ResultatMatiere | null => {
      const row = rowsByMatiereId.get(matiere.id) || rowsByMatiereNom.get(matiere.nom);
      if (!row) return null;
      const savedCorrections = row.details?.correctionsIA || null;
      const rawScoreMax = toFiniteNumber(row.score_max, 0);
      const computedMax = calculerMaxPoints(matiere);
      const safeScoreMax = rawScoreMax > 0 ? rawScoreMax : computedMax;
      const safeScoreObtenu = safeScoreMax > 0 ? clamp(toFiniteNumber(row.score_obtenu, 0), 0, safeScoreMax) : Math.max(toFiniteNumber(row.score_obtenu, 0), 0);
      const safeNoteSur = matiere.noteSur || 20;
      return {
        matiereId: row.matiere_id || matiere.id,
        nomMatiere: row.matiere_nom || matiere.nom,
        noteObtenue: safeScoreObtenu,
        maxPoints: safeScoreMax,
        noteSur: safeNoteSur,
        noteEliminatoire: matiere.noteEliminatoire || 0,
        coefficient: matiere.coefficient || 1,
        admis: computeAdmisForMatiere(safeScoreObtenu, safeScoreMax, matiere.noteEliminatoire, safeNoteSur, Boolean(row.reussi)),
        reponses: row.details?.reponses || {},
        correctionsIA: savedCorrections,
      };
    }).filter((r): r is ResultatMatiere => r !== null);

    if (results.length === 0) { toast.error("Résultats introuvables pour les matières de cet examen."); return; }
    setExamenChoisi(examReference);
    setTousResultats(results);
    setIsViewingSavedResults(true);
    setPhase("resultats");
  };

  const handleDebuterExamen = () => {
    examStartTimeRef.current = Date.now();
    setIsViewingSavedResults(false);
    setPhase("examen");
    if (examenChoisi) persistExamSession("examen", examenChoisi.id, 0);
  };

  const calculerMaxPoints = (matiere: Matiere): number => {
    const questionsSafe = (matiere.questions ?? []).filter((q): q is Question => q != null && q?.type != null);
    return questionsSafe.reduce((acc, q) => acc + getPointsParQuestion(matiere.id, q?.type || "QCM", matiere), 0);
  };

  const calculerNote = (matiere: Matiere, reponses: Reponses): number => {
    const questionsSafe = (matiere.questions ?? []).filter((q): q is Question => q != null && q?.type != null);
    let totalPoints = 0;
    questionsSafe.forEach(q => {
      if (!q || !q?.type) return;
      const rep = reponses?.[q.id] ?? reponses?.[String(q.id)];
      const pts = getPointsParQuestion(matiere.id, q?.type, matiere);
      if (q?.type === "QCM" && q.choix) {
        const correctes = safeArray<string>(q.choix?.filter(c => c.correct).map(c => c.lettre)).sort();
        const donnees = safeArray<string>(rep).sort();
        if (JSON.stringify(correctes) === JSON.stringify(donnees)) totalPoints += pts;
      } else if (q?.type === "QRC") {
        const correction = evaluateQrcDeterministic(q, rep, pts);
        totalPoints += correction.pointsObtenus;
      }
    });
    return totalPoints;
  };

  const saveMatiereResult = async ({ examen, matiere, resultat, dureeSecondes }: { examen: ExamenBlanc; matiere: Matiere; resultat: ResultatMatiere; dureeSecondes: number }) => {
    if (!apprenantId || !userId) return;
    const rawQuestions = matiere?.questions || [];
    const questionsSafe = rawQuestions.filter(q => q != null);
    const frozenCorrections: Record<string, any> = {};
    const questionDetails = questionsSafe.map(q => {
      if (!q) return null;
      const rep = resultat.reponses?.[q.id];
      if (q?.type === "QRC") {
        const pts = getPointsParQuestion(matiere.id, q?.type || "QRC", matiere);
        frozenCorrections[q.id] = evaluateQrcDeterministic(q, rep, pts);
      }
      return {
        questionId: q.id, enonce: q.enonce || "", type: q?.type || "QCM", reponseEleve: rep ?? null,
        reponseCorrecte: q?.type === "QCM" && q.choix ? q.choix.filter(c => c.correct).map(c => c.lettre) : (q.reponseQRC || (q.reponses_possibles || []).join(" / ")),
      };
    }).filter(Boolean);

    const safeScoreMax = Math.max(toFiniteNumber(resultat.maxPoints, 0), 0);
    const safeScoreObtenu = safeScoreMax > 0 ? clamp(toFiniteNumber(resultat.noteObtenue, 0), 0, safeScoreMax) : Math.max(toFiniteNumber(resultat.noteObtenue, 0), 0);
    const quizType = examen.id.startsWith("bilan-") ? "bilan" : "examen_blanc";
    const noteSur20 = normalizeNoteSur20(safeScoreObtenu, safeScoreMax);

    const payload = {
      apprenant_id: apprenantId, user_id: userId, quiz_type: quizType, quiz_id: examen.id, quiz_titre: examen.titre,
      matiere_id: resultat.matiereId, matiere_nom: resultat.nomMatiere, score_obtenu: safeScoreObtenu, score_max: safeScoreMax,
      note_sur_20: noteSur20, reussi: computeAdmisForMatiere(safeScoreObtenu, safeScoreMax, resultat.noteEliminatoire, resultat.noteSur, Boolean(resultat.admis)),
      duree_secondes: Math.max(Math.round(dureeSecondes), 0),
      details: { questions: questionDetails, reponses: resultat.reponses, correctionsIA: Object.keys(frozenCorrections).length > 0 ? frozenCorrections : undefined },
    };

    const { error } = await supabase.from("apprenant_quiz_results" as any).insert([payload] as any);
    if (error) console.error("[ExamSubmission][EB][InsertError]", error);
  };

  const handleTerminerMatiere = (reponses: Reponses) => {
    try {
      if (!examenChoisi) return;
      const matiere = examenChoisi.matieres[matiereIndex];
      if (!matiere) { toast.error("Matière introuvable. Veuillez relancer l'examen."); return; }
      const note = calculerNote(matiere, reponses);
      const maxPoints = calculerMaxPoints(matiere);
      const noteSecurisee = maxPoints > 0 ? clamp(note, 0, maxPoints) : Math.max(note, 0);
      const resultat: ResultatMatiere = {
        matiereId: matiere.id, nomMatiere: matiere.nom, noteObtenue: noteSecurisee, maxPoints,
        noteSur: matiere.noteSur, noteEliminatoire: matiere.noteEliminatoire, coefficient: matiere.coefficient,
        admis: computeAdmisForMatiere(noteSecurisee, maxPoints, matiere.noteEliminatoire, matiere.noteSur, false), reponses,
      };
      const newResultats = [...tousResultats, resultat];
      setTousResultats(newResultats);
      if (apprenantId && userId) {
        const elapsedSeconds = Math.round((Date.now() - examStartTimeRef.current) / 1000);
        void saveMatiereResult({ examen: examenChoisi, matiere, resultat, dureeSecondes: elapsedSeconds / Math.max(newResultats.length, 1) });
      }
      if (matiereIndex < examenChoisi.matieres.length - 1) {
        const nextIndex = matiereIndex + 1;
        setLastMatiereResult(resultat);
        setMatiereIndex(nextIndex);
        setPhase("transition");
        persistExamSession("examen", examenChoisi.id, nextIndex, newResultats);
      } else {
        setIsViewingSavedResults(false);
        setPhase("resultats");
        setSelectionRefreshKey(k => k + 1);
        persistExamSession("resultats", null, 0);
      }
    } catch (err) {
      console.error("[ExamenBlanc] Erreur dans handleTerminerMatiere:", err);
      toast.error("Une erreur est survenue lors du calcul des résultats. Veuillez réessayer.");
    }
  };

  // ===== RENDER =====
  if (phase === "edition") {
    return <ExamensBlancsEditor onBack={() => setPhase("selection")} />;
  }

  if (phase === "selection") {
    return (
      <>
        {loadTimeout && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement en cours, veuillez patienter…
          </div>
        )}
        <EcranSelection
          onStart={handleStart}
          onEdit={() => { if (!isAdmin) { toast.error("Accès réservé à l'administration."); return; } setPhase("edition"); }}
          onViewResults={handleViewResults}
          defaultBilanId={bilanPrefiltre}
          apprenantType={apprenantType}
          examensData={liveExamens}
          apprenantId={apprenantId}
          isAdmin={isAdmin}
          refreshKey={selectionRefreshKey}
          pausedExamIds={pausedExamIds}
          onPauseToggle={handlePauseToggle}
        />
      </>
    );
  }

  if (phase === "intro" && examenChoisi) {
    const dureeTotal = examenChoisi.matieres.reduce((acc, m) => acc + m.duree, 0);
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setPhase("selection")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            <Badge className="mx-auto mb-2 w-fit" variant={examenChoisi?.type === "TAXI" ? "default" : "secondary"}>{examenChoisi?.type}</Badge>
            <CardTitle className="text-xl">{examenChoisi.titre}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-800"><AlertTriangle className="w-4 h-4" /> Consignes importantes</div>
              <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                <li>Chaque matière est <strong>chronométrée individuellement</strong></li>
                <li>Le temps s'écoule dès que vous démarrez la matière</li>
                <li>Les questions QRC sont corrigées par mots-clés</li>
                <li>Une note éliminatoire inférieure au seuil entraîne l'échec</li>
                <li>Vous ne pouvez pas revenir à une matière terminée</li>
                <li className="text-base font-bold text-red-700">⚠️ VOUS DEVEZ RÉPONDRE À TOUTES LES QUESTIONS AVANT DE VALIDER</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Matières et durées</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2 font-medium">Matière</th>
                      <th className="text-center p-2 font-medium">Durée</th>
                      <th className="text-center p-2 font-medium">Barème</th>
                      <th className="text-center p-2 font-medium">QCM</th>
                      <th className="text-center p-2 font-medium">QRC</th>
                      <th className="text-center p-2 font-medium">Coeff.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examenChoisi.matieres.map((m, i) => {
                      if (!m) return null;
                      const questionsSafe = (m.questions || []).filter(q => q && q?.type !== undefined);
                      const maxPts = questionsSafe.reduce((acc, q) => acc + getPointsParQuestion(m.id, q?.type || "QCM", m), 0);
                      return (
                        <tr key={m.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <td className="p-2 text-xs">{m.nom}</td>
                          <td className="p-2 text-center">{m.duree} min</td>
                          <td className="p-2 text-center font-semibold">{maxPts} pts</td>
                          <td className="p-2 text-center text-blue-600">{getPointsParQuestion(m.id, "QCM", m)} pt</td>
                          <td className="p-2 text-center text-purple-600">{getPointsParQuestion(m.id, "QRC", m)} pts</td>
                          <td className="p-2 text-center">{m.coefficient}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 font-semibold bg-primary/5">
                      <td className="p-2">TOTAL</td>
                      <td className="p-2 text-center">{dureeTotal} min</td>
                      <td className="p-2 text-center">{examenChoisi.matieres.reduce((acc, m) => {
                        if (!m) return acc;
                        return acc + (m.questions || []).filter(q => q && q?.type !== undefined).reduce((a, q) => a + getPointsParQuestion(m.id, q?.type || "QCM", m), 0);
                      }, 0)} pts</td>
                      <td className="p-2"></td><td className="p-2"></td>
                      <td className="p-2 text-center">Note finale /20</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <Button className="w-full gap-2 text-base py-5 text-white font-semibold" style={{ backgroundColor: '#F4A227' }} onClick={handleDebuterExamen}>
              <Timer className="w-5 h-5" /> Démarrer l'examen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "transition" && examenChoisi && lastMatiereResult) {
    const matiereSuivante = examenChoisi.matieres[matiereIndex];
    return (
      <TransitionMatiere
        matiereTerminee={lastMatiereResult.nomMatiere}
        scoreObtenu={lastMatiereResult.noteObtenue}
        maxPoints={lastMatiereResult.maxPoints}
        noteSur={lastMatiereResult.noteSur}
        matiereSuivante={matiereSuivante?.nom || "Matière suivante"}
        numeroSuivant={matiereIndex + 1}
        total={examenChoisi.matieres.length}
        onContinuer={() => { setLastMatiereResult(null); setPhase("examen"); }}
      />
    );
  }

  if (phase === "examen" && examenChoisi) {
    const matiere = examenChoisi.matieres[matiereIndex];
    if (!matiere) return null;
    return (
      <div className="flex gap-6 max-w-[1200px] mx-auto">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {examenChoisi.matieres.map((_, i) => (
                <div key={i} className={`h-2 rounded-full transition-all ${i < matiereIndex ? "w-8 bg-green-500" : i === matiereIndex ? "w-8 bg-primary" : "w-4 bg-muted"}`} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Matière {matiereIndex + 1}/{examenChoisi.matieres.length}</span>
            {!isAdmin && (
              <Button variant="outline" size="sm" onClick={handleManualReloadQuestions} disabled={isReloadingQuestions} className="ml-auto gap-2">
                {isReloadingQuestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Recharger les questions
              </Button>
            )}
          </div>
          <PassageMatiere matiere={matiere} numero={matiereIndex + 1} total={examenChoisi.matieres.length} onTerminer={handleTerminerMatiere} isBilan={examenChoisi.id.startsWith("bilan-")} apprenantId={apprenantId} examenId={examenChoisi.id} isAdmin={!!isAdmin} />
        </div>
        <div className="hidden min-[520px]:block w-36 sm:w-40 md:w-48 lg:w-56 shrink-0">
          <div className="sticky top-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Progression</p>
            <div className="relative">
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-muted rounded-full" />
              <div className="absolute left-4 top-4 w-0.5 bg-primary rounded-full transition-all duration-500" style={{ height: `${examenChoisi.matieres.length > 1 ? (matiereIndex / (examenChoisi.matieres.length - 1)) * 100 : 100}%`, maxHeight: 'calc(100% - 2rem)' }} />
              <div className="space-y-1">
                {examenChoisi.matieres.map((m, i) => {
                  if (!m) return null;
                  const isDone = i < matiereIndex;
                  const isCurrent = i === matiereIndex;
                  return (
                    <div key={m.id} className={`relative flex items-start gap-3 p-2 rounded-lg transition-all ${isCurrent ? "bg-primary/10 border border-primary/30" : isDone ? "bg-green-50 border border-green-200" : "opacity-50"}`}>
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border-2 transition-all ${isDone ? "bg-green-500 border-green-500 text-white" : isCurrent ? "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20" : "bg-background border-muted text-muted-foreground"}`}>
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      <div className="min-w-0 pt-1">
                        <p className={`text-xs font-medium leading-tight truncate ${isCurrent ? "text-primary" : isDone ? "text-green-700" : "text-muted-foreground"}`}>{m.nom.split(" - ")[0]}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{isDone ? "✓ Terminée" : isCurrent ? `En cours • ${m.duree}min` : `${m.duree}min`}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "revision" && examenChoisi) {
    const wrongQuestions: { matiere: Matiere; question: Question; matiereNom: string }[] = [];
    examenChoisi.matieres.forEach((matiere, mi) => {
      if (!matiere || matiere.id === "francais" || matiere.id === "bilan_francais") return;
      const r = tousResultats[mi];
      if (!r) return;
      const qSafe = (matiere.questions || []).filter((q): q is Question => !!q && q?.type !== undefined);
      const savedCorrectionsIA = r.correctionsIA || (r as any).details?.correctionsIA || {};
      qSafe.forEach(q => {
        const rep = r.reponses?.[q.id];
        let isCorrect = false;
        if (q?.type === "QCM" && q.choix) {
          const correctes = safeArray<string>(q.choix?.filter(c => c.correct).map(c => c.lettre)).sort();
          const donnees = safeArray<string>(rep).sort();
          isCorrect = JSON.stringify(correctes) === JSON.stringify(donnees);
        } else if (q?.type === "QRC") {
          const corrIA = savedCorrectionsIA[q.id] || savedCorrectionsIA[String(q.id)];
          if (corrIA && typeof corrIA === "object" && ("estCorrect" in corrIA || "pointsObtenus" in corrIA)) {
            isCorrect = "estCorrect" in corrIA ? !!(corrIA as any).estCorrect : (corrIA as any).pointsObtenus > 0;
          } else {
            const repStr = safeStr(rep).toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, "");
            const motsCles = q.reponses_possibles || [];
            let nbTrouvees = 0;
            motsCles.forEach(mc => { const mcN = mc.toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, ""); if (repStr.includes(mcN)) nbTrouvees++; });
            isCorrect = nbTrouvees >= motsCles.length;
          }
        }
        if (!isCorrect) wrongQuestions.push({ matiere, question: q, matiereNom: matiere.nom });
      });
    });

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setPhase("resultats")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Retour aux résultats</Button>
          <h2 className="text-xl font-bold" style={{ color: '#0D2540' }}>🎯 Révision des questions fausses</h2>
        </div>
        <div className="rounded-lg px-4 py-3" style={{ backgroundColor: '#FFF3E0', border: '2px solid #F4A227' }}>
          <p className="text-sm font-semibold" style={{ color: '#D84315' }}>{wrongQuestions.length} question{wrongQuestions.length > 1 ? "s" : ""} à réviser (hors épreuve de Français)</p>
        </div>
        <RevisionFausses wrongQuestions={wrongQuestions} onTerminer={() => setPhase("resultats")} apprenantId={apprenantId} userId={userId} examenId={examenChoisi.id} />
      </div>
    );
  }

  if (phase === "resultats" && examenChoisi) {
    return (
      <div className="max-w-3xl mx-auto">
        <EcranResultats examen={examenChoisi} resultats={tousResultats} onRecommencer={() => handleStart(examenChoisi)} onRetour={() => { setSelectionRefreshKey(k => k + 1); setPhase("selection"); }} onRefaireFausses={() => setPhase("revision")} apprenantId={apprenantId} userId={userId} isViewingSaved={isViewingSavedResults} isAdmin={isAdmin} canRetry={Boolean(isAdmin)} isPresentiel={isPresentiel} />
      </div>
    );
  }

  return null;
}
