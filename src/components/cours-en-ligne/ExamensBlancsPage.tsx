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
  buildMatiereLookupKeys, shareLookupKey, getMatiereCanonicalKey,
} from "./examens-blancs-utils";
import { recoverCorruptedScoreRow, isCorruptedZeroRow } from "./examens-blancs-utils";
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

  // BUG #3 FIX: restoreSession is now synchronous for initial state,
  // but the useEffect below will verify against DB and purge if already completed
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
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

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
        // CRITICAL: Never replace examenChoisi during an active exam (phase=examen/transition)
        // to prevent question reordering that causes answer mismatches
        setExamenChoisi((prev) => {
          if (!prev) return prev;
          const currentPhase = phaseRef.current;
          if (currentPhase === "examen" || currentPhase === "transition") return prev;
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
    let cancelled = false;

    const restore = async () => {
      if (!savedSession?.examenId) {
        if (!cancelled) setSessionRestored(true);
        return;
      }

      const found = liveExamens.find(e => e.id === savedSession.examenId);
      if (!found) {
        if (!cancelled) setSessionRestored(true);
        return;
      }

      // Priority check: DB state is source of truth for completed/partial exams
      if (!isAdmin && apprenantId) {
        const quizType = found.id.startsWith("bilan-") ? "bilan" : "examen_blanc";
        const { data, error } = await supabase
          .from("apprenant_quiz_results" as any)
          .select("matiere_id, matiere_nom, score_obtenu, score_max, reussi, details, completed_at, created_at")
          .eq("apprenant_id", apprenantId)
          .eq("quiz_id", found.id)
          .eq("quiz_type", quizType);

        if (!cancelled && !error) {
          const rows = (data as any[]) || [];
          const validMatieres = (found.matieres || []).filter((m): m is Matiere => Boolean(m));
          const required = Math.max(validMatieres.length || 1, 1);

          const latestByCanonicalKey = new Map<string, any>();
          rows.forEach((row: any) => {
            const key = getMatiereCanonicalKey(row?.matiere_id, row?.matiere_nom);
            const prev = latestByCanonicalKey.get(key);
            const prevTs = prev ? Math.max(toTimestamp(prev.completed_at), toTimestamp(prev.created_at)) : 0;
            const currTs = Math.max(toTimestamp(row?.completed_at), toTimestamp(row?.created_at));
            if (!prev || currTs >= prevTs) latestByCanonicalKey.set(key, row);
          });

          const doneLookupKeys = new Set<string>();
          Array.from(latestByCanonicalKey.values()).forEach((row: any) => {
            buildMatiereLookupKeys(row?.matiere_id, row?.matiere_nom).forEach((k) => doneLookupKeys.add(k));
          });

          const doneCount = validMatieres.filter((m) =>
            buildMatiereLookupKeys(m.id, m.nom).some((k) => doneLookupKeys.has(k))
          ).length;

          const isCompleted = doneCount >= required || (rows.length >= required && doneCount >= Math.max(required - 1, 0));

          if (isCompleted) {
            try { sessionStorage.removeItem(EXAM_SESSION_KEY); } catch {}
            setExamenChoisi(found);
            await handleViewResults(found);
            if (!cancelled) setSessionRestored(true);
            return;
          }

          // Partial completion: resume directly from DB (ignore potentially stale sessionStorage index)
          if (doneCount > 0) {
            const isMatiereDone = (matiere: Matiere) =>
              buildMatiereLookupKeys(matiere?.id, matiere?.nom).some((key) => doneLookupKeys.has(key));

            const preloadedResults: ResultatMatiere[] = [];
            for (let i = 0; i < found.matieres.length; i++) {
              const m = found.matieres[i];
              if (!m) continue;
              const expectedKeys = buildMatiereLookupKeys(m.id, m.nom);
              const row = Array.from(latestByCanonicalKey.values()).find((r: any) =>
                shareLookupKey(buildMatiereLookupKeys(r?.matiere_id, r?.matiere_nom), expectedKeys)
              );

              if (row) {
                const maxPts = calculerMaxPoints(m);
                const safeScoreMax = toFiniteNumber(row.score_max, maxPts);
                const safeScoreObtenu = clamp(toFiniteNumber(row.score_obtenu, 0), 0, safeScoreMax || maxPts);
                preloadedResults.push({
                  matiereId: m.id,
                  nomMatiere: m.nom,
                  noteObtenue: safeScoreObtenu,
                  maxPoints: safeScoreMax || maxPts,
                  noteSur: m.noteSur || 20,
                  noteEliminatoire: m.noteEliminatoire || 0,
                  coefficient: m.coefficient || 1,
                  admis: computeAdmisForMatiere(safeScoreObtenu, safeScoreMax || maxPts, m.noteEliminatoire, m.noteSur, Boolean(row.reussi)),
                  reponses: row.details?.reponses || {},
                });
              } else {
                preloadedResults.push(null as any);
              }
            }

            const resumeIndex = found.matieres.findIndex((m) => m && !isMatiereDone(m));
            if (resumeIndex >= 0) {
              setExamenChoisi(found);
              setPhase("examen");
              setMatiereIndex(resumeIndex);
              setTousResultats(preloadedResults);
              persistExamSession("examen", found.id, resumeIndex, preloadedResults);
              if (!cancelled) setSessionRestored(true);
              return;
            }
          }
        }
      }

      if (!cancelled) {
        setExamenChoisi(found);
        setPhase("examen");
        setMatiereIndex(savedSession.matiereIndex || 0);
        if (savedSession.resultats?.length) setTousResultats(savedSession.resultats);
        setSessionRestored(true);
      }
    };

    void restore();
    return () => { cancelled = true; };
  }, [liveExamens, sessionRestored, isAdmin, apprenantId]);

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

  const handleStart = async (examen: ExamenBlanc, forceRetake = false) => {
    const latestExamen = liveExamens.find((live) => live.id === examen.id) ?? examen;
    const quizType = latestExamen.id.startsWith("bilan-") ? "bilan" : "examen_blanc";

    if (!isAdmin && apprenantId && !forceRetake) {
      // Check which matières are already completed
      const { data: existingResults, error } = await supabase
        .from("apprenant_quiz_results" as any)
        .select("matiere_id, matiere_nom, score_obtenu, score_max, reussi, details, completed_at, created_at")
        .eq("apprenant_id", apprenantId)
        .eq("quiz_id", latestExamen.id)
        .eq("quiz_type", quizType);

      if (error) { toast.error("Vérification de sécurité impossible. Réessayez."); return; }

      const completedRows = (existingResults as any[]) || [];
      const validMatieres = (latestExamen.matieres || []).filter((m): m is Matiere => Boolean(m));
      const matieresTotal = Math.max(validMatieres.length || 1, 1);

      // Secondary fallback: ONLY completed=true responses can mark exam as completed
      let responseFallbackCompleted = false;
      if (completedRows.length < validMatieres.length) {
        const { data: savedResponses } = await supabase
          .from("reponses_apprenants" as any)
          .select("exercice_id, completed")
          .eq("apprenant_id", apprenantId)
          .eq("exercice_type", "examen_blanc")
          .like("exercice_id", `${latestExamen.id}_%`);

        const completedResponseLookupKeys = new Set<string>();
        ((savedResponses as any[]) || []).forEach((r: any) => {
          if (r?.completed !== true) return;
          const exerciceId = safeStr(r?.exercice_id);
          const matiereKey = exerciceId.startsWith(`${latestExamen.id}_`)
            ? exerciceId.slice(`${latestExamen.id}_`.length)
            : "";
          if (!matiereKey) return;
          buildMatiereLookupKeys(matiereKey, matiereKey).forEach((k) => completedResponseLookupKeys.add(k));
        });

        responseFallbackCompleted =
          validMatieres.length > 0 &&
          validMatieres.every((m) =>
            buildMatiereLookupKeys(m.id, m.nom).some((k) => completedResponseLookupKeys.has(k))
          );
      }

      const latestByCanonicalKey = new Map<string, any>();
      completedRows.forEach((row: any) => {
        const key = getMatiereCanonicalKey(row?.matiere_id, row?.matiere_nom);
        const prev = latestByCanonicalKey.get(key);
        const prevTs = prev ? Math.max(toTimestamp(prev.completed_at), toTimestamp(prev.created_at)) : 0;
        const currTs = Math.max(toTimestamp(row?.completed_at), toTimestamp(row?.created_at));
        if (!prev || currTs >= prevTs) latestByCanonicalKey.set(key, row);
      });

      const latestCompletedRows = Array.from(latestByCanonicalKey.values());
      const completedLookupKeys = new Set<string>();
      latestCompletedRows.forEach((row: any) => {
        buildMatiereLookupKeys(row?.matiere_id, row?.matiere_nom).forEach((key) => completedLookupKeys.add(key));
      });

      const isMatiereDone = (matiere: Matiere) =>
        buildMatiereLookupKeys(matiere?.id, matiere?.nom).some((key) => completedLookupKeys.has(key));

      const completedMatiereCount = validMatieres.filter((m) => isMatiereDone(m)).length;
      const allCompleted = completedMatiereCount >= matieresTotal;

      if (allCompleted || responseFallbackCompleted) {
        // Redirect to results view instead of blocking with toast
        toast.info("Examen déjà terminé. Affichage de vos résultats.", { duration: 3000, icon: "✅" });
        handleViewResults(latestExamen);
        return;
      }

      // Fallback for legacy/corrupted rows where matière_id/matière_nom mapping is partially lost
      const legacyCompletionFallback =
        completedRows.length >= matieresTotal &&
        completedMatiereCount >= Math.max(matieresTotal - 1, 0);

      if (legacyCompletionFallback) {
        toast.info("Examen déjà terminé. Affichage de vos résultats.", { duration: 3000, icon: "✅" });
        handleViewResults(latestExamen);
        return;
      }

      // If partially completed, resume at first uncompleted matière
      if (latestCompletedRows.length > 0) {
        const preloadedResults: ResultatMatiere[] = [];

        for (let i = 0; i < latestExamen.matieres.length; i++) {
          const m = latestExamen.matieres[i];
          if (!m) continue;
          const expectedKeys = buildMatiereLookupKeys(m.id, m.nom);
          const row = latestCompletedRows.find((r: any) =>
            shareLookupKey(buildMatiereLookupKeys(r?.matiere_id, r?.matiere_nom), expectedKeys)
          );
          if (row) {
            const maxPts = calculerMaxPoints(m);
            const safeScoreMax = toFiniteNumber(row.score_max, maxPts);
            const safeScoreObtenu = clamp(toFiniteNumber(row.score_obtenu, 0), 0, safeScoreMax || maxPts);
            preloadedResults.push({
              matiereId: m.id,
              nomMatiere: m.nom,
              noteObtenue: safeScoreObtenu,
              maxPoints: safeScoreMax || maxPts,
              noteSur: m.noteSur || 20,
              noteEliminatoire: m.noteEliminatoire || 0,
              coefficient: m.coefficient || 1,
              admis: computeAdmisForMatiere(safeScoreObtenu, safeScoreMax || maxPts, m.noteEliminatoire, m.noteSur, Boolean(row.reussi)),
              reponses: row.details?.reponses || {},
            });
          } else {
            // Push null placeholder to keep indices aligned
            preloadedResults.push(null as any);
          }
        }

        // Find actual first uncompleted
        const resumeIndex = latestExamen.matieres.findIndex((m) => m && !isMatiereDone(m));
        if (resumeIndex < 0) {
          // All done by ID match — show results
          toast.info("Examen déjà terminé. Affichage de vos résultats.", { duration: 3000, icon: "✅" });
          handleViewResults(latestExamen);
          return;
        }

        const nbDone = completedMatiereCount;
        const nbRemaining = Math.max(matieresTotal - nbDone, 0);
        toast.info(`${nbDone} matière${nbDone > 1 ? "s" : ""} déjà terminée${nbDone > 1 ? "s" : ""}. Il reste ${nbRemaining} épreuve${nbRemaining > 1 ? "s" : ""}.`, { duration: 5000, icon: "📋" });

        setBilanPrefiltre(null);
        setExamenChoisi(latestExamen);
        setMatiereIndex(resumeIndex);
        setTousResultats(preloadedResults);
        setPhase("intro");
        return;
      }
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
    const quizType = examReference.id.startsWith("bilan-") ? "bilan" : "examen_blanc";

    const rebuildResultsFromSavedResponses = async (): Promise<ResultatMatiere[] | null> => {
      if (!apprenantId || !userId) return null;

      const { data: savedResponses } = await supabase
        .from("reponses_apprenants" as any)
        .select("exercice_id, reponses, score, completed")
        .eq("apprenant_id", apprenantId)
        .eq("exercice_type", "examen_blanc")
        .like("exercice_id", `${examReference.id}_%`);

      const responseRows = (savedResponses as any[]) || [];
      const completedResponses = responseRows.filter((r: any) => r?.completed === true);
      const candidateResponses = completedResponses.length > 0
        ? completedResponses
        : responseRows.filter((r: any) => r?.reponses && Object.keys(r.reponses || {}).length > 0);

      if (candidateResponses.length === 0) return null;

      const rebuiltResults: ResultatMatiere[] = [];
      for (const matiere of examReference.matieres) {
        if (!matiere) continue;
        const expectedKeys = buildMatiereLookupKeys(matiere.id, matiere.nom);
        const resp = candidateResponses.find((r: any) => {
          const exerciceId = safeStr(r?.exercice_id);
          const matiereKey = exerciceId.startsWith(`${examReference.id}_`)
            ? exerciceId.slice(`${examReference.id}_`.length)
            : "";
          if (!matiereKey) return false;
          const responseKeys = buildMatiereLookupKeys(matiereKey, matiereKey);
          return shareLookupKey(responseKeys, expectedKeys);
        });
        if (!resp) continue;

        const reponses = resp.reponses || {};
        const questionsSafe = (matiere.questions ?? []).filter((q): q is Question => q != null && q?.type != null);
        const maxPoints = questionsSafe.reduce((acc, q) => acc + getPointsParQuestion(matiere.id, q?.type || "QCM", matiere), 0);
        const note = questionsSafe.reduce((total, q) => {
          if (!q || !q?.type) return total;
          const rep = reponses?.[q.id] ?? reponses?.[String(q.id)];
          const pts = getPointsParQuestion(matiere.id, q?.type, matiere);
          if (q?.type === "QCM" && q.choix) {
            const correctes = safeArray<string>(q.choix?.filter(c => c.correct).map(c => c.lettre)).sort();
            const donnees = safeArray<string>(rep).sort();
            if (JSON.stringify(correctes) === JSON.stringify(donnees)) return total + pts;
          } else if (q?.type === "QRC") {
            const correction = evaluateQrcDeterministic(q, rep, pts);
            return total + correction.pointsObtenus;
          }
          return total;
        }, 0);

        const safeNote = maxPoints > 0 ? clamp(note, 0, maxPoints) : Math.max(note, 0);
        const noteSur20 = normalizeNoteSur20(safeNote, maxPoints);
        const admis = computeAdmisForMatiere(safeNote, maxPoints, matiere.noteEliminatoire, matiere.noteSur || 20, false);

        await supabase
          .from("apprenant_quiz_results" as any)
          .upsert([{
            apprenant_id: apprenantId,
            user_id: userId,
            quiz_type: quizType,
            quiz_id: examReference.id,
            quiz_titre: examReference.titre,
            matiere_id: matiere.id,
            matiere_nom: matiere.nom,
            score_obtenu: safeNote,
            score_max: maxPoints,
            note_sur_20: noteSur20,
            reussi: admis,
            details: { reponses },
          }] as any, { onConflict: "apprenant_id,quiz_id,matiere_id" } as any);

        rebuiltResults.push({
          matiereId: matiere.id,
          nomMatiere: matiere.nom,
          noteObtenue: safeNote,
          maxPoints,
          noteSur: matiere.noteSur || 20,
          noteEliminatoire: matiere.noteEliminatoire || 0,
          coefficient: matiere.coefficient || 1,
          admis,
          reponses,
        });
      }

      return rebuiltResults.length > 0 ? rebuiltResults : null;
    };

    const { data } = await supabase
      .from("apprenant_quiz_results" as any)
      .select("*")
      .eq("apprenant_id", apprenantId)
      .eq("quiz_id", examReference.id)
      .eq("quiz_type", quizType);

    const rows = (data as any[]) || [];
    const hasOnlyZeroScores = rows.length > 0 && rows.every((row: any) => toFiniteNumber(row?.score_obtenu, 0) <= 0);

    // Rebuild from stored responses if quiz_results is empty or only zero-score rows
    if (rows.length === 0 || hasOnlyZeroScores) {
      const rebuiltResults = await rebuildResultsFromSavedResponses();
      if (!rebuiltResults) { toast.error("Aucun résultat exploitable trouvé."); return; }
      toast.success(`${rebuiltResults.length} résultat(s) recalculé(s) depuis vos réponses.`);
      setExamenChoisi(examReference);
      setTousResultats(rebuiltResults);
      setIsViewingSavedResults(true);
      setPhase("resultats");
      persistExamSession("resultats", null, 0);
      return;
    }

    const latestByMatiere = new Map<string, any>();
    (data as any[]).forEach((row: any, idx: number) => {
      const key = getMatiereCanonicalKey(row?.matiere_id, row?.matiere_nom) || `unknown-${idx}`;
      const prev = latestByMatiere.get(key);
      const prevTs = prev ? Math.max(toTimestamp(prev.completed_at), toTimestamp(prev.created_at)) : 0;
      const currTs = Math.max(toTimestamp(row.completed_at), toTimestamp(row.created_at));
      if (!prev || currTs >= prevTs) latestByMatiere.set(key, row);
    });

    const latestRows = Array.from(latestByMatiere.values());
    const rowsWithLookup = latestRows.map((row: any) => ({
      row,
      lookupKeys: buildMatiereLookupKeys(row?.matiere_id, row?.matiere_nom),
    }));

    const calculerMaxPoints = (matiere: Matiere): number => {
      const questionsSafe = (matiere.questions ?? []).filter((q): q is Question => q != null && q?.type != null);
      return questionsSafe.reduce((acc, q) => acc + getPointsParQuestion(matiere.id, q?.type || "QCM", matiere), 0);
    };

    const results = examReference.matieres.map((matiere): ResultatMatiere | null => {
      const expectedKeys = buildMatiereLookupKeys(matiere.id, matiere.nom);
      const row = rowsWithLookup.find((entry) => shareLookupKey(entry.lookupKeys, expectedKeys))?.row;
      if (!row) return null;
      const savedCorrections = row.details?.correctionsIA || null;
      const rawScoreMax = toFiniteNumber(row.score_max, 0);
      const computedMax = calculerMaxPoints(matiere);
      const safeScoreMax = rawScoreMax > 0 ? rawScoreMax : computedMax;

      // Auto-heal corrupted zero-score rows
      let safeScoreObtenu = safeScoreMax > 0 ? clamp(toFiniteNumber(row.score_obtenu, 0), 0, safeScoreMax) : Math.max(toFiniteNumber(row.score_obtenu, 0), 0);
      if (safeScoreObtenu <= 0 && isCorruptedZeroRow(row)) {
        const recovered = recoverCorruptedScoreRow(row, liveExamens);
        if (recovered && recovered.score_obtenu > 0) {
          safeScoreObtenu = recovered.score_obtenu;
          console.warn(`[handleViewResults][AutoHeal] ${row.quiz_id}/${row.matiere_id}: 0 -> ${recovered.score_obtenu}/${recovered.score_max}`);
          // Persist healed score back to DB (fire-and-forget)
          void supabase
            .from("apprenant_quiz_results" as any)
            .update({
              score_obtenu: recovered.score_obtenu,
              score_max: recovered.score_max,
              note_sur_20: recovered.note_sur_20,
            } as any)
            .eq("id", row.id)
            .then(({ error }) => {
              if (error) console.error("[AutoHeal] DB update failed:", error);
              else console.log(`[AutoHeal] DB healed ${row.quiz_id}/${row.matiere_id} -> ${recovered.score_obtenu}`);
            });
        }
      }

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
    persistExamSession("resultats", null, 0);
  };

  const handleDebuterExamen = () => {
    examStartTimeRef.current = Date.now();
    setIsViewingSavedResults(false);
    setPhase("examen");
    if (examenChoisi) persistExamSession("examen", examenChoisi.id, matiereIndex, tousResultats);
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

    // Save with retry logic to prevent silent data loss
    let saved = false;
    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * attempt));
      const { error } = await supabase
        .from("apprenant_quiz_results" as any)
        .upsert([payload] as any, { onConflict: "apprenant_id,quiz_id,matiere_id" } as any);
      if (!error) {
        saved = true;
        console.log(`[ExamSubmission][EB] Saved ${resultat.matiereId} (attempt ${attempt + 1})`);
      } else {
        console.error(`[ExamSubmission][EB][UpsertError] attempt ${attempt + 1}:`, error);
      }
    }
    if (!saved) {
      toast.error("⚠️ Erreur d'enregistrement du résultat après 3 tentatives. Vos réponses sont sauvegardées, contactez l'administration.", { duration: 15000 });
    }
    return saved;
  };

  const handleTerminerMatiere = async (reponses: Reponses) => {
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

      // Place result at the correct index (supports resume with pre-loaded results)
      const newResultats = [...tousResultats];
      newResultats[matiereIndex] = resultat;
      setTousResultats(newResultats);

      if (apprenantId && userId) {
        const elapsedSeconds = Math.round((Date.now() - examStartTimeRef.current) / 1000);
        const completedCount = newResultats.filter(r => r != null).length;
        // Await the save - don't fire-and-forget, to ensure results persist
        const saved = await saveMatiereResult({ examen: examenChoisi, matiere, resultat, dureeSecondes: elapsedSeconds / Math.max(completedCount, 1) });
        if (!saved) {
          console.warn("[ExamenBlanc] Failed to save result for", matiere.id, "- result kept in memory");
        }
      }

      // Find next uncompleted matière (skip already-done ones from resume)
      let nextIndex = -1;
      for (let i = matiereIndex + 1; i < examenChoisi.matieres.length; i++) {
        if (!newResultats[i]) { nextIndex = i; break; }
      }

      if (nextIndex >= 0) {
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
    return <ExamensBlancsEditor onBack={() => setPhase("selection")} pausedExamIds={pausedExamIds} onPauseToggle={handlePauseToggle} />;
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
              {examenChoisi.matieres.map((_, i) => {
                const done = tousResultats[i] != null;
                return <div key={i} className={`h-2 rounded-full transition-all ${done ? "w-8 bg-green-500" : i === matiereIndex ? "w-8 bg-primary" : "w-4 bg-muted"}`} />;
              })}
            </div>
            <span className="text-xs text-muted-foreground">Matière {matiereIndex + 1}/{examenChoisi.matieres.length}</span>
            {/* Bouton recharger retiré pendant l'examen pour éviter le décalage des questions */}
          </div>
          <PassageMatiere matiere={matiere} numero={matiereIndex + 1} total={examenChoisi.matieres.length} onTerminer={handleTerminerMatiere} isBilan={examenChoisi.id.startsWith("bilan-")} apprenantId={apprenantId} examenId={examenChoisi.id} />
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
                  const isDone = tousResultats[i] != null;
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
        <EcranResultats examen={examenChoisi} resultats={tousResultats} onRecommencer={() => handleStart(examenChoisi, true)} onRetour={() => { setSelectionRefreshKey(k => k + 1); setPhase("selection"); }} onRefaireFausses={() => setPhase("revision")} apprenantId={apprenantId} userId={userId} isViewingSaved={isViewingSavedResults} isAdmin={isAdmin} canRetry={true} isPresentiel={isPresentiel} />
      </div>
    );
  }

  return null;
}
