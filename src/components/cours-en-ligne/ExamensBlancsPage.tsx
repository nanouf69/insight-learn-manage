// Re-export all sub-components and utilities for backward compatibility
// This file was split from the original monolithic ExamensBlancsPage.tsx

import { blockLearnerWrite } from "@/lib/learnerPreviewGuard";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Loader2, RotateCcw, CheckCircle2 } from "lucide-react";
import { tousLesExamens, getPointsParQuestion, type ExamenBlanc, type Matiere, type Question } from "./examens-blancs-data";
import { loadSavedExamens, EXAMEN_BLANC_MODULE_BASE, getModuleIdForExamId } from "./ExamensBlancsEditor";
import ExamensBlancsEditor from "./ExamensBlancsEditor";
import { supabase } from "@/integrations/supabase/client";
import { answersAreEqual } from "@/lib/answerPersistence";
import { buildExamMatiereExerciceId } from "@/lib/quizAttempts";

import { enqueueQuizResultSave } from "@/lib/quizResultPersistence";
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
  extractMatiereKeyFromExerciceId,
  selectLatestAttemptRows, getAttemptNumber, findBestSavedAnswerRow,
  getSavedAnswerRowAttempt, getSavedAnswerRowTimestamp, getMeaningfulAnswerCount,
  allocateFreshExamMatiereExerciceId, resolveExamPassage,
  type SavedExamAnswerRow,
} from "./examens-blancs-utils";
import { recoverCorruptedScoreRow, isCorruptedZeroRow, persistExamSession as persistExamSessionUtil, shouldTriggerPollingRefresh } from "./examens-blancs-utils";
import { EcranSelection } from "./ExamenBlancsListe";
import { PassageMatiere, TransitionMatiere } from "./ExamenBlancsPassage";
import { EcranResultats, RevisionFausses } from "./ExamenBlancsResultats";
import { computeMatiereScore, computeMatiereScoreForAttempt, resolveMatiereForScoring, MATIERE_SNAPSHOT_VERSION } from "./examens-blancs-scoring";
import { excludeResultPlaceholders, mergePassageSiblingRows } from "./exam-helpers";
import { buildFinalizationKey, runFinalizationOnce, resolveIdempotentTentative } from "@/lib/examFinalizationGuard";
import { syncQrcInstances } from "@/lib/qrcInstances";

/** Texte exact de la réponse QRC de l'élève (jamais reformaté ni corrigé). */
function safeQrcAnswerText(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(" ");
  return String(value);
}
import { auditQrcCoherence, reportQrcIncoherence } from "@/lib/examPassageIdentity";
import { recoverMatiereFromSavedAnswers, canFinalizeMatiere } from "@/lib/examMatiereRecovery";

/**
 * Retrouve la version ORIGINALE (source statique, jamais éditée) d'une matière
 * pour un examen donné. Sert de repli sûr dans computeMatiereScore quand les
 * réponses stockées d'un élève ne correspondent plus à la version actuelle
 * (question supprimée/modifiée après coup) : on recalcule alors contre la
 * version d'origine, toujours intacte, plutôt que de se fier à une note
 * stockée qui peut elle-même être déjà corrompue.
 */
function findStaticFallbackMatiere(examId: string, matiereId: string, matiereNom?: string): Matiere | null {
  const staticExam = tousLesExamens.find((e) => e.id === examId);
  if (!staticExam) return null;
  return (
    staticExam.matieres.find((m) => m.id === matiereId) ||
    (matiereNom ? staticExam.matieres.find((m) => m.nom === matiereNom) : undefined) ||
    null
  );
}

/**
 * MODE « MATIÈRES AU CHOIX » (nouveau mode, additionnel).
 * Restreint la liste des matières d'un examen à celles sélectionnées par
 * l'apprenant, sans modifier les questions, réponses, barèmes ni le mode
 * d'évaluation. Le mode complet (toutes les matières, dans l'ordre) reste
 * inchangé lorsqu'aucun filtre n'est fourni.
 */
function applyMatiereFilter(examen: ExamenBlanc | null, matiereIds?: string[] | null): ExamenBlanc | null {
  if (!examen) return examen;
  if (!matiereIds || matiereIds.length === 0) return examen;
  const wanted = new Set(matiereIds);
  const matieres = (examen.matieres || []).filter((m) => m && wanted.has(m.id));
  if (matieres.length === 0) return examen;
  return { ...examen, matieres };
}


export default function ExamensBlancsPage({
  defaultBilanId,
  onBilanConsumed,
  apprenantId,
  userId,
  apprenantType,
  isAdmin,
  isPresentiel,
  onExamStateChange,
  onLearnerActivity,
}: {
  defaultBilanId?: string | null;
  onBilanConsumed?: () => void;
  apprenantId?: string | null;
  userId?: string | null;
  apprenantType?: string | null;
  isAdmin?: boolean;
  isPresentiel?: boolean;
  onExamStateChange?: (isInExam: boolean) => void;
  onLearnerActivity?: () => void;
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

  // Mode « matières au choix » : mémorisation du sous-ensemble sélectionné
  const MATIERE_FILTER_KEY = `${EXAM_SESSION_KEY}_matieres`;
  const readSavedMatiereFilter = (): string[] | null => {
    try {
      const raw = sessionStorage.getItem(MATIERE_FILTER_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length ? parsed.map(String) : null;
    } catch { return null; }
  };
  const matiereFilterRef = useRef<string[] | null>(readSavedMatiereFilter());
  const setMatiereFilter = (ids: string[] | null) => {
    matiereFilterRef.current = ids && ids.length ? ids : null;
    try {
      if (matiereFilterRef.current) sessionStorage.setItem(MATIERE_FILTER_KEY, JSON.stringify(matiereFilterRef.current));
      else sessionStorage.removeItem(MATIERE_FILTER_KEY);
    } catch {}
  };
  const [examenChoixMatieres, setExamenChoixMatieres] = useState<ExamenBlanc | null>(null);
  const [matieresSelectionnees, setMatieresSelectionnees] = useState<string[]>([]);

  // BUG #2 FIX: never trust sessionStorage for initial phase — always start with "selection"
  // and let the async DB verification (useEffect below) set the correct phase after confirmation
  const [phase, setPhase] = useState<"selection" | "intro" | "examen" | "transition" | "resultats" | "edition" | "revision" | "choix-matieres">("selection");
  const [examenChoisi, setExamenChoisi] = useState<ExamenBlanc | null>(null);
  // BUG #2 FIX: always start at 0, DB verification will set the correct index
  const [matiereIndex, setMatiereIndex] = useState(0);
  const [tousResultats, setTousResultats] = useState<ResultatMatiere[]>(safeArray<ResultatMatiere>(savedSession?.resultats));
  const [lastMatiereResult, setLastMatiereResult] = useState<ResultatMatiere | null>(null);
  const [isViewingSavedResults, setIsViewingSavedResults] = useState(false);
  const [bilanPrefiltre, setBilanPrefiltre] = useState<string | null>(null);
  // AUCUN REPLI STATIQUE : tant que la version active n'est pas confirmée,
  // la liste reste vide et aucune question n'est affichée.
  const [liveExamens, setLiveExamens] = useState<ExamenBlanc[]>([]);
  const [liveExamensLoaded, setLiveExamensLoaded] = useState(false);
  const [liveExamensError, setLiveExamensError] = useState(false);
  const [selectionRefreshKey, setSelectionRefreshKey] = useState(0);
  const [isReloadingQuestions, setIsReloadingQuestions] = useState(false);
  const examStartTimeRef = useRef<number>(savedSession?.examStartTime || Date.now());
  const reloadInFlightRef = useRef<Promise<ExamenBlanc[]> | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [pausedExamIds, setPausedExamIds] = useState<Set<string>>(new Set());
  const [currentTentative, setCurrentTentative] = useState<number>(1);
  const currentTentativeRef = useRef<number>(1);
  const [resumeExerciceIds, setResumeExerciceIds] = useState<Record<string, string>>({});
  // Identité du passage en cours : "new" = tentative neuve, "resume" = reprise.
  const currentPassageModeRef = useRef<"resume" | "new">("new");
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

  const pendingReloadRef = useRef(false);
  const refreshLiveExamens = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!force && reloadInFlightRef.current) {
      // Don't drop the reload — mark it pending so it runs after the in-flight one
      pendingReloadRef.current = true;
      return reloadInFlightRef.current;
    }
    setLoadTimeout(false);
    const timeoutTimer = setTimeout(() => setLoadTimeout(true), 10_000);
    reloadInFlightRef.current = (async () => {
      try {
        const saved = await loadSavedExamens();
        logSecurityImageDebug(saved, force ? "manual-refetch" : "auto-refetch");
        setLiveExamens(saved);
        setLiveExamensError(false);
        setLiveExamensLoaded(true);
        // CRITICAL: Never replace examenChoisi during an active exam or results display
        // to prevent question reordering that causes answer mismatches
        setExamenChoisi((prev) => {
          if (!prev) return prev;
          const currentPhase = phaseRef.current;
          if (currentPhase === "examen" || currentPhase === "transition" || currentPhase === "resultats") return prev;
          const next = saved.find((exam) => exam.id === prev.id) ?? prev;
          return applyMatiereFilter(next, matiereFilterRef.current);
        });
        return saved;
      } catch (err) {
        // Version active non confirmée : on n'affiche AUCUNE question.
        // Le contenu déjà chargé reste inchangé, rien n'est remplacé.
        console.error("[ExamensBlancs] Version active indisponible", err);
        setLiveExamensError(true);
        return [] as ExamenBlanc[];
      } finally {
        clearTimeout(timeoutTimer);
        setLoadTimeout(false);
      }
    })();
    try { return await reloadInFlightRef.current; }
    finally {
      reloadInFlightRef.current = null;
      // If a reload was requested while we were in-flight, run it now
      if (pendingReloadRef.current) {
        pendingReloadRef.current = false;
        void refreshLiveExamens({ force: true });
      }
    }
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

  // Extracted to examens-blancs-utils.ts for testability (BUG #8 FIX)
  const persistExamSession = (p: string, exId: string | null, mi: number, resultats?: ResultatMatiere[], currentReponses?: Reponses, questionIndex?: number) => {
    persistExamSessionUtil(EXAM_SESSION_KEY, p, exId, mi, examStartTimeRef.current, resultats, currentReponses, questionIndex);
  };

  // Restore chosen exam once liveExamens loaded FROM DB (not hardcoded source).
  // Without this gate, restore races with refreshLiveExamens() and picks
  // hardcoded tousLesExamens data — losing all admin edits.
  const [sessionRestored, setSessionRestored] = useState(false);
  useEffect(() => {
    if (sessionRestored || !liveExamensLoaded) return;
    let cancelled = false;

    const restore = async () => {
      if (!savedSession?.examenId) {
        if (!cancelled) setSessionRestored(true);
        return;
      }

      const found = applyMatiereFilter(liveExamens.find(e => e.id === savedSession.examenId) ?? null, matiereFilterRef.current);
      if (!found) {
        if (!cancelled) setSessionRestored(true);
        return;
      }

      // Priority check: DB state is source of truth for completed/partial exams
      if (!isAdmin && apprenantId) {
        const quizType = found.id.startsWith("bilan-") ? "bilan" : "examen_blanc";
        const { data, error } = await supabase
          .from("apprenant_quiz_results" as any)
            .select("id, matiere_id, matiere_nom, score_obtenu, score_max, reussi, details, tentative, completed_at, created_at")
          .eq("apprenant_id", apprenantId)
          .eq("quiz_id", found.id)
          .eq("quiz_type", quizType);

        if (!cancelled && !error) {
          // Même logique de passage que la file Correction QRC et l'écran récapitulatif :
          // les écritures techniques d'un même passage réel sont lues ensemble (lecture seule).
          const rows = mergePassageSiblingRows(excludeResultPlaceholders(data as any[]));
          const validMatieres = (found.matieres || []).filter((m): m is Matiere => Boolean(m));
          const required = Math.max(validMatieres.length || 1, 1);

          const latestByCanonicalKey = new Map<string, any>();
          selectLatestAttemptRows(rows).forEach((row: any) => {
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
                  resultId: row.id,
                  matiereId: m.id,
                  nomMatiere: m.nom,
                  noteObtenue: safeScoreObtenu,
                  maxPoints: safeScoreMax || maxPts,
                  noteSur: m.noteSur || 20,
                  noteEliminatoire: m.noteEliminatoire || 0,
                  coefficient: m.coefficient || 1,
                  admis: computeAdmisForMatiere(safeScoreObtenu, safeScoreMax || maxPts, m.noteEliminatoire, m.noteSur, Boolean(row.reussi)),
                  reponses: row.details?.reponses || {},
                  correctionsIA: row.details?.correctionsIA || null,
                  tentative: getAttemptNumber(row),
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
        // BUG #2 FIX: validate matiereIndex bounds before using it
        const maxIndex = Math.max((found.matieres?.length || 1) - 1, 0);
        setMatiereIndex(Math.min(savedSession.matiereIndex || 0, maxIndex));
        if (savedSession.resultats?.length) setTousResultats(savedSession.resultats);
        setSessionRestored(true);
      }
    };

    void restore();
    return () => { cancelled = true; };
  }, [liveExamens, liveExamensLoaded, sessionRestored, isAdmin, apprenantId]);

  // BUG #9 FIX: only block during active exam phase, allow updates during intro/transition
  const isInExam = phase === "examen";
  const isInExamBroad = phase === "examen" || phase === "intro" || phase === "transition";

  useEffect(() => {
    onExamStateChange?.(isInExamBroad);
    return () => { onExamStateChange?.(false); };
  }, [isInExamBroad, onExamStateChange]);

  useEffect(() => {
    if (!isInExamBroad) { void refreshLiveExamens(); }
  }, [refreshLiveExamens, isInExamBroad]);

  // Realtime: targeted update when admin saves exam changes
  // BUG #9 FIX: only disabled during active exam phase, allowed during intro/transition
  // Track last Realtime-triggered refresh for polling fallback
  const lastRealtimeRefreshRef = useRef(Date.now());
  useEffect(() => {
    if (isInExam) return;
    const validExamModuleIds = new Set(tousLesExamens.map((ex) => getModuleIdForExamId(ex.id)));
    const isExamModuleEvent = (payload: any) => {
      const moduleId = Number(payload?.new?.module_id ?? payload?.old?.module_id);
      return Number.isFinite(moduleId) && validExamModuleIds.has(moduleId);
    };
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    // Use unique channel name to prevent stale channel references on reconnect
    const channelName = `examens-blancs-live-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'module_editor_state' }, (payload) => {
        if (!isExamModuleEvent(payload)) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log("[Realtime] Exam blanc updated, reloading...");
          lastRealtimeRefreshRef.current = Date.now();
          try { sessionStorage.removeItem(EXAM_SESSION_KEY); } catch {}
          void refreshLiveExamens();
        }, 1000);
      })
      .subscribe();
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [refreshLiveExamens, EXAM_SESSION_KEY, isInExam]);

  // Polling fallback: when Realtime is silent for > 60s, check for admin changes
  // This catches cases where Supabase Realtime silently disconnects
  const POLLING_FALLBACK_INTERVAL = 8_000; // check every 8s
  const REALTIME_SILENCE_THRESHOLD = 15_000; // consider Realtime stale after 15s
  const lastKnownUpdatedAtRef = useRef<string | null>(null);
  useEffect(() => {
    if (isInExam) return;
    const validModuleIds = tousLesExamens.map((ex) => getModuleIdForExamId(ex.id));

    const pollTimer = setInterval(async () => {
      if (!shouldTriggerPollingRefresh({
        lastRealtimeRefreshAt: lastRealtimeRefreshRef.current,
        now: Date.now(),
        pollingIntervalMs: REALTIME_SILENCE_THRESHOLD,
      })) return;

      // Lightweight check: only fetch max updated_at
      try {
        const { data, error } = await supabase
          .from("module_editor_state")
          .select("updated_at")
          .in("module_id", validModuleIds)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (error || !data || data.length === 0) return;
        const remoteUpdatedAt = data[0].updated_at as string;

        if (lastKnownUpdatedAtRef.current && remoteUpdatedAt !== lastKnownUpdatedAtRef.current) {
          console.log("[PollingFallback] Remote data changed, refreshing...");
          try { sessionStorage.removeItem(EXAM_SESSION_KEY); } catch {}
          void refreshLiveExamens();
        }
        lastKnownUpdatedAtRef.current = remoteUpdatedAt;
      } catch {
        // Silently ignore polling errors
      }
    }, POLLING_FALLBACK_INTERVAL);

    return () => clearInterval(pollTimer);
  }, [refreshLiveExamens, EXAM_SESSION_KEY, isInExam]);

  useEffect(() => {
    if (defaultBilanId) { setBilanPrefiltre(defaultBilanId); onBilanConsumed?.(); }
  }, [defaultBilanId]);

  const handleStart = async (examen: ExamenBlanc, forceRetake = false, matiereIds?: string[] | null) => {
    // matiereIds === undefined → on conserve le filtre courant ; null → mode complet
    if (matiereIds !== undefined) setMatiereFilter(matiereIds);
    const latestExamen = applyMatiereFilter(liveExamens.find((live) => live.id === examen.id) ?? examen, matiereFilterRef.current)!;
    const quizType = latestExamen.id.startsWith("bilan-") ? "bilan" : "examen_blanc";

    let nextTentative = 1;
    if (apprenantId && !isAdmin) {
      const [{ data: tRows, error: resultError }, { data: answerRows, error: answerError }] = await Promise.all([
        supabase
        .from("apprenant_quiz_results" as any)
        .select("id, matiere_id, matiere_nom, score_obtenu, score_max, reussi, details, tentative, completed_at, created_at")
        .eq("apprenant_id", apprenantId)
        .eq("quiz_id", latestExamen.id)
        .eq("quiz_type", quizType),
        supabase
          .from("reponses_apprenants" as any)
          .select("exercice_id, reponses, completed, status, tentative, created_at, updated_at, submitted_at, write_seq")
          .eq("apprenant_id", apprenantId)
          .eq("exercice_type", quizType)
          .like("exercice_id", `${latestExamen.id}_%`),
      ]);

      if (resultError || answerError) { toast.error("Vérification de sécurité impossible. Réessayez."); return; }

      const allResultRows = mergePassageSiblingRows(excludeResultPlaceholders(tRows as any[]));
      const savedRows = (((answerRows as unknown) as SavedExamAnswerRow[]) || []).filter((row) =>
        Boolean(extractMatiereKeyFromExerciceId(safeStr(row.exercice_id), latestExamen.id))
      );
      const knownAttempts = new Set<number>([1]);
      allResultRows.forEach((row: any) => knownAttempts.add(getAttemptNumber(row)));
      savedRows.forEach((row) => knownAttempts.add(getSavedAnswerRowAttempt(row, latestExamen.id)));
      const validMatieres = (latestExamen.matieres || []).filter((m): m is Matiere => Boolean(m));
      const attemptStates = Array.from(knownAttempts).map((attempt) => {
        const resultRows = allResultRows.filter((row: any) => getAttemptNumber(row) === attempt);
        const resultKeys = new Set<string>();
        resultRows.forEach((row: any) => buildMatiereLookupKeys(row?.matiere_id, row?.matiere_nom).forEach((key) => resultKeys.add(key)));
        const completedCount = validMatieres.filter((matiere) =>
          buildMatiereLookupKeys(matiere.id, matiere.nom).some((key) => resultKeys.has(key))
        ).length;
        const answerRowsForAttempt = savedRows.filter((row) => getSavedAnswerRowAttempt(row, latestExamen.id) === attempt);
        return {
          attempt,
          completedCount,
          hasWork: answerRowsForAttempt.some((row) => getMeaningfulAnswerCount(row.reponses) > 0) || completedCount > 0,
          lastActivity: Math.max(
            ...answerRowsForAttempt.map(getSavedAnswerRowTimestamp),
            ...resultRows.map((row: any) => Math.max(toTimestamp(row.completed_at), toTimestamp(row.created_at))),
            0,
          ),
        };
      });
      const unfinishedAttempts = attemptStates
        .filter((state) => state.hasWork && state.completedCount < validMatieres.length)
        .sort((a, b) => b.lastActivity - a.lastActivity || b.attempt - a.attempt);
      const activeAttempt = unfinishedAttempts[0]?.attempt
        ?? attemptStates.reduce((max, state) => Math.max(max, state.attempt), 1);
      const completedRows = allResultRows.filter((row: any) => getAttemptNumber(row) === activeAttempt);
      const matieresTotal = Math.max(validMatieres.length || 1, 1);
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

      if (allCompleted && !forceRetake) {
        toast.info("Examen déjà terminé. Affichage de vos résultats.", { duration: 3000, icon: "✅" });
        handleViewResults(latestExamen);
        return;
      }

      // SOURCE UNIQUE D'IDENTITÉ DU PASSAGE : reprise du passage ouvert, ou
      // création d'un passage entièrement neuf. Jamais d'écriture dans une
      // tentative terminée (elle est immuable).
      const passage = resolveExamPassage({
        examId: latestExamen.id,
        matieres: validMatieres,
        resultRows: allResultRows,
        savedRows,
        forceRetake,
      });

      const bestRowsByMatiere = new Map<string, SavedExamAnswerRow>();
      validMatieres.forEach((matiere) => {
        const best = findBestSavedAnswerRow({ rows: savedRows, examId: latestExamen.id, matiere, tentative: passage.tentative });
        if (best) bestRowsByMatiere.set(matiere.id, best);
      });

      const hasSavedWork = passage.mode === "resume"
        && Array.from(bestRowsByMatiere.values()).some((row) => getMeaningfulAnswerCount(row.reponses) > 0);
      const hasIncompletePassage = passage.mode === "resume" && !allCompleted && (hasSavedWork || completedMatiereCount > 0);

      nextTentative = passage.tentative;
      currentPassageModeRef.current = passage.mode;
      setResumeExerciceIds(passage.exerciceIds);
      setCurrentTentative(nextTentative);
      currentTentativeRef.current = nextTentative;

      if (hasIncompletePassage) {
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
              resultId: row.id,
              matiereId: m.id,
              nomMatiere: m.nom,
              noteObtenue: safeScoreObtenu,
              maxPoints: safeScoreMax || maxPts,
              noteSur: m.noteSur || 20,
              noteEliminatoire: m.noteEliminatoire || 0,
              coefficient: m.coefficient || 1,
              admis: computeAdmisForMatiere(safeScoreObtenu, safeScoreMax || maxPts, m.noteEliminatoire, m.noteSur, Boolean(row.reussi)),
              reponses: row.details?.reponses || {},
              correctionsIA: row.details?.correctionsIA || null,
              tentative: getAttemptNumber(row),
            });
          } else {
            // Push null placeholder to keep indices aligned
            preloadedResults.push(null as any);
          }
        }

        const unfinishedStarted = latestExamen.matieres
          .map((matiere, index) => ({ matiere, index, row: matiere ? bestRowsByMatiere.get(matiere.id) : undefined }))
          .filter(({ matiere, row }) => Boolean(matiere && row && !isMatiereDone(matiere) && getMeaningfulAnswerCount(row?.reponses) > 0))
          .sort((a, b) => getSavedAnswerRowTimestamp(b.row as SavedExamAnswerRow) - getSavedAnswerRowTimestamp(a.row as SavedExamAnswerRow));
        const resumeIndex = unfinishedStarted[0]?.index ?? latestExamen.matieres.findIndex((m) => m && !isMatiereDone(m));
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
    } else if (apprenantId) {
      setResumeExerciceIds({});
    }

    setCurrentTentative(nextTentative);
    currentTentativeRef.current = nextTentative;

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
          const matiereKey = extractMatiereKeyFromExerciceId(exerciceId, examReference.id);
          if (!matiereKey) return false;
          const responseKeys = buildMatiereLookupKeys(matiereKey, matiereKey);
          return shareLookupKey(responseKeys, expectedKeys);
        });

        const questionsSafe = (matiere.questions ?? []).filter((q): q is Question => q != null && q?.type != null);
        const maxPoints = questionsSafe.reduce((acc, q) => acc + getPointsParQuestion(matiere.id, q?.type || "QCM", matiere), 0);

        // Placeholder for non-attempted matières so ALL 7 matières always display.
        if (!resp) {
          rebuiltResults.push({
            matiereId: matiere.id,
            nomMatiere: matiere.nom,
            noteObtenue: 0,
            maxPoints,
            noteSur: matiere.noteSur || 20,
            noteEliminatoire: matiere.noteEliminatoire || 0,
            coefficient: matiere.coefficient || 1,
            admis: false,
            reponses: {},
            nonPassee: true,
          } as ResultatMatiere);
          continue;
        }

        const reponses = resp.reponses || {};
        const score = computeMatiereScore(matiere, reponses, 0, maxPoints, null, findStaticFallbackMatiere(examReference.id, matiere.id, matiere.nom));
        const safeNote = score?.scoreObtenu ?? 0;
        const safeMaxPoints = score?.scoreMax ?? maxPoints;
        const noteSur20 = score?.noteSur20 ?? normalizeNoteSur20(safeNote, safeMaxPoints);
        const admis = score?.admis ?? computeAdmisForMatiere(safeNote, safeMaxPoints, matiere.noteEliminatoire, matiere.noteSur || 20, false);

        rebuiltResults.push({
          matiereId: matiere.id,
          nomMatiere: matiere.nom,
          noteObtenue: safeNote,
          maxPoints: safeMaxPoints,
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

    const rows = selectLatestAttemptRows(mergePassageSiblingRows(excludeResultPlaceholders(data as any[])));
    // Surveillance (lecture seule) : journalise toute divergence « élève en
    // attente / aucune QRC réellement à corriger ». Ne modifie jamais rien.
    try {
      const coherence = auditQrcCoherence(data as any[]);
      if (coherence.incoherences.length > 0) void reportQrcIncoherence(coherence, "examens-blancs/resultats");
    } catch { /* la surveillance ne doit jamais bloquer l'affichage */ }
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
      // BUG #2 FIX: purge any stale exam sessionStorage immediately on entering results phase
      try { sessionStorage.removeItem(EXAM_SESSION_KEY); } catch {}
      return;
    }

    const rowsWithLookup = rows.map((row: any) => ({
      row,
      lookupKeys: buildMatiereLookupKeys(row?.matiere_id, row?.matiere_nom),
    }));

    const calculerMaxPoints = (matiere: Matiere): number => {
      const questionsSafe = (matiere.questions ?? []).filter((q): q is Question => q != null && q?.type != null);
      return questionsSafe.reduce((acc, q) => acc + getPointsParQuestion(matiere.id, q?.type || "QCM", matiere), 0);
    };

    // POINT 6 — version FIGÉE utilisée pour l'affichage des tentatives déjà passées.
    const frozenMatieres: Matiere[] = [];

    const results = examReference.matieres.map((matiereCourante): ResultatMatiere => {
      const expectedKeys = buildMatiereLookupKeys(matiereCourante.id, matiereCourante.nom);
      const row = rowsWithLookup.find((entry) => shareLookupKey(entry.lookupKeys, expectedKeys))?.row;
      // Tentative figée : on relit questions/choix/bonnes réponses/barème d'origine.
      const matiere = resolveMatiereForScoring(matiereCourante, row?.details);
      frozenMatieres.push(matiere);
      const safeNoteSur = matiere.noteSur || 20;
      const computedMax = calculerMaxPoints(matiere);

      // Placeholder for matières that were not attempted so ALL matières of the exam
      // stay visible (7 for VTC) and keep their canonical order from the data file.
      if (!row) {
        return {
          matiereId: matiere.id,
          nomMatiere: matiere.nom,
          noteObtenue: 0,
          maxPoints: computedMax,
          noteSur: safeNoteSur,
          noteEliminatoire: matiere.noteEliminatoire || 0,
          coefficient: matiere.coefficient || 1,
          admis: false,
          reponses: {},
          nonPassee: true,
        } as ResultatMatiere;
      }

      const savedCorrections = row.details?.correctionsIA || null;
      const rawScoreMax = toFiniteNumber(row.score_max, 0);
      const safeScoreMax = rawScoreMax > 0 ? rawScoreMax : computedMax;

      // Auto-heal corrupted zero-score rows
      let safeScoreObtenu = safeScoreMax > 0 ? clamp(toFiniteNumber(row.score_obtenu, 0), 0, safeScoreMax) : Math.max(toFiniteNumber(row.score_obtenu, 0), 0);
      let normalizedScoreMax = safeScoreMax;
      // Tentative avec snapshot → recalcul sur la version figée.
      // Tentative sans snapshot → note enregistrée, jamais recalculée sur les questions actuelles.
      const canonicalScore = computeMatiereScoreForAttempt(
        matiereCourante,
        {
          details: row.details,
          score_obtenu: row.score_obtenu,
          score_max: safeScoreMax,
          note_sur_20: row.note_sur_20,
        },
        findStaticFallbackMatiere(examReference.id, matiere.id, matiere.nom),
      );
      if (canonicalScore) {
        safeScoreObtenu = canonicalScore.scoreObtenu;
        normalizedScoreMax = canonicalScore.scoreMax;
      }
      if (safeScoreObtenu <= 0 && isCorruptedZeroRow(row)) {
        const recovered = recoverCorruptedScoreRow(row, liveExamens);
        if (recovered && recovered.score_obtenu > 0) {
          safeScoreObtenu = recovered.score_obtenu;
          normalizedScoreMax = recovered.score_max;
          console.warn(`[handleViewResults][AutoHeal] ${row.quiz_id}/${row.matiere_id}: 0 -> ${recovered.score_obtenu}/${recovered.score_max}`);
          // Diagnostic d'affichage uniquement : aucune note n'est réécrite.
        }
      }

      return {
        resultId: row.id,
        matiereId: row.matiere_id || matiere.id,
        nomMatiere: row.matiere_nom || matiere.nom,
        noteObtenue: safeScoreObtenu,
        maxPoints: normalizedScoreMax,
        noteSur: safeNoteSur,
        noteEliminatoire: matiere.noteEliminatoire || 0,
        coefficient: matiere.coefficient || 1,
        admis: canonicalScore?.admis ?? computeAdmisForMatiere(safeScoreObtenu, normalizedScoreMax, matiere.noteEliminatoire, safeNoteSur, Boolean(row.reussi)),
        reponses: row.details?.reponses || {},
        correctionsIA: savedCorrections,
        details: row.details,
        tentative: getAttemptNumber(row),
      };
    });

    if (results.length === 0) { toast.error("Résultats introuvables pour les matières de cet examen."); return; }

    // Affichage des résultats : on montre la version exacte passée par l'apprenant
    // (snapshot) quand elle existe, sinon la version actuelle (comportement historique).
    setExamenChoisi(
      frozenMatieres.length === examReference.matieres.length
        ? { ...examReference, matieres: frozenMatieres }
        : examReference,
    );
    setTousResultats(results);
    setIsViewingSavedResults(true);
    setPhase("resultats");

    // BUG #2 FIX: purge any stale exam sessionStorage immediately on entering results phase
    try { sessionStorage.removeItem(EXAM_SESSION_KEY); } catch {}
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

  const saveMatiereResultInner = async ({ examen, matiere, resultat, dureeSecondes }: { examen: ExamenBlanc; matiere: Matiere; resultat: ResultatMatiere; dureeSecondes: number }) => {
    if (!apprenantId || !userId) return;
    let rawQuestions = matiere?.questions || [];
    // FIX: fallback to source data when matiere.questions is empty (frozen examenChoisi)
    if (rawQuestions.length === 0 && matiere?.id) {
      for (const srcExam of tousLesExamens) {
        const srcMat = srcExam.matieres.find(m => m.id === matiere.id);
        if (srcMat?.questions?.length) { rawQuestions = srcMat.questions; break; }
      }
    }
    const questionsSafe = rawQuestions.filter(q => q != null);
    const frozenCorrections: Record<string, any> = {};
    const questionDetails = questionsSafe.map(q => {
      if (!q) return null;
      const rep = resultat.reponses?.[q.id] ?? resultat.reponses?.[String(q.id)];
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

    // GARDE-FOU : jamais de note artificielle à 0. Si aucune réponse n'est
    // réellement présente, on n'écrit AUCUN résultat : les réponses déjà
    // sauvegardées restent intactes et la reprise pourra reconstruire la note.
    const recovery = recoverMatiereFromSavedAnswers({
      matiere: { ...matiere, questions: questionsSafe } as any,
      reponses: resultat.reponses as any,
      correctionsIA: frozenCorrections,
    });
    if (!canFinalizeMatiere(recovery) && safeScoreObtenu === 0) {
      console.warn("[ExamSubmission][EB] Finalisation refusée : aucune réponse enregistrée pour", resultat.matiereId);
      return false;
    }

    // QRC : tant que l'administrateur n'a pas validé les QRC, la matière reste
    // « En attente de correction » (pas de statut Réussi/Échoué définitif).
    const hasQrc = questionsSafe.some((q: any) => String(q?.type || "").toUpperCase() === "QRC");

    // POINT 6 — SNAPSHOT : on fige la version exacte utilisée par l'apprenant
    // (questions, choix proposés, bonnes réponses, barème, ordre). Une
    // modification Admin ultérieure ne pourra plus transformer cette tentative.
    const snapshot = {
      version: MATIERE_SNAPSHOT_VERSION,
      matiereId: matiere.id,
      nom: matiere.nom,
      noteSur: matiere.noteSur,
      coefficient: matiere.coefficient,
      noteEliminatoire: matiere.noteEliminatoire,
      ptsQCM: matiere.ptsQCM ?? getPointsParQuestion(matiere.id, "QCM", matiere),
      ptsQRC: matiere.ptsQRC ?? getPointsParQuestion(matiere.id, "QRC", matiere),
      createdAt: new Date().toISOString(),
      questions: questionsSafe.map((q: any, idx: number) => ({
        id: q.id,
        type: q?.type || "QCM",
        enonce: q.enonce || "",
        choix: Array.isArray(q.choix)
          ? q.choix.map((c: any) => ({ lettre: c?.lettre, texte: c?.texte, correct: Boolean(c?.correct) }))
          : undefined,
        reponseQRC: q.reponseQRC,
        reponses_possibles: q.reponses_possibles,
        points: getPointsParQuestion(matiere.id, q?.type || "QCM", matiere),
        // Image telle qu'elle était présentée à l'apprenant (relecture fidèle).
        image: q.image ?? null,
        imageSize: q.imageSize ?? q.image_size ?? null,
        ordre: idx,
      })),
    };

    // FINALISATION IDEMPOTENTE : si une écriture du MÊME passage réel existe
    // déjà (double clic, réessai réseau, rechargement), on réutilise son numéro
    // de tentative pour mettre à jour cette ligne au lieu d'en créer une sœur.
    // Aucune donnée existante n'est supprimée ni réécrite hors de ce passage.
    const desiredTentative = Math.max(currentTentativeRef.current || currentTentative || 1, 1);
    let effectiveTentative = desiredTentative;
    try {
      const { data: existingRows } = await supabase
        .from("apprenant_quiz_results" as any)
        .select("id, quiz_id, quiz_type, matiere_id, tentative, completed_at, created_at, details")
        .eq("apprenant_id", apprenantId)
        .eq("quiz_id", examen.id)
        .eq("quiz_type", quizType);
      effectiveTentative = resolveIdempotentTentative({
        rows: (existingRows as any[]) || [],
        quizId: examen.id,
        quizType,
        matiereId: resultat.matiereId,
        desiredTentative,
        passageMode: currentPassageModeRef.current,
      });
    } catch (lookupError) {
      console.warn("[ExamSubmission][EB] Lecture des passages existants impossible:", lookupError);
    }

    const payload = {
      apprenant_id: apprenantId, user_id: userId, quiz_type: quizType, quiz_id: examen.id, quiz_titre: examen.titre,
      matiere_id: resultat.matiereId, matiere_nom: resultat.nomMatiere, score_obtenu: safeScoreObtenu, score_max: safeScoreMax,
      note_sur_20: noteSur20, reussi: computeAdmisForMatiere(safeScoreObtenu, safeScoreMax, resultat.noteEliminatoire, resultat.noteSur, Boolean(resultat.admis)),
      duree_secondes: Math.max(Math.round(dureeSecondes), 0),
      details: {
        questions: questionDetails,
        reponses: resultat.reponses,
        correctionsIA: Object.keys(frozenCorrections).length > 0 ? frozenCorrections : undefined,
        snapshot,
        ...(hasQrc ? { qrc_pending_correction: true } : {}),
      },
      tentative: effectiveTentative,
    };

    // Save with retry logic to prevent silent data loss.
    // Tablets left idle during a long exam can have their auth session/JWT
    // expire in the background (Android battery-saving throttling). A stale
    // token makes the write fail RLS checks silently. Before each retry, force
    // a session refresh so an expired token doesn't keep failing forever.
    // Consultation admin (Vue apprenant) : aucune note ni tentative créée.
    if (blockLearnerWrite("apprenant_quiz_results(examen blanc)")) return;

    let saved = false;
    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        try {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) console.warn(`[ExamSubmission][EB] Session refresh failed (attempt ${attempt + 1}):`, refreshError);
        } catch (refreshErr) {
          console.warn(`[ExamSubmission][EB] Session refresh threw (attempt ${attempt + 1}):`, refreshErr);
        }
      }
      const { error } = await supabase
        .from("apprenant_quiz_results" as any)
        .upsert([payload] as any, { onConflict: "apprenant_id,quiz_id,matiere_id,tentative" } as any);
      if (!error) {
        saved = true;
        console.log(`[ExamSubmission][EB] Saved ${resultat.matiereId} (attempt ${attempt + 1})`);
      } else {
        console.error(`[ExamSubmission][EB][UpsertError] attempt ${attempt + 1}:`, error);
      }
    }
    if (!saved) {
      // La note n'est PAS abandonnée après 3 essais : elle entre dans une file
      // durable (localStorage, liée au compte propriétaire) et sera renvoyée
      // automatiquement jusqu'à confirmation par la base.
      enqueueQuizResultSave(payload as any);
      toast.error(
        `⚠️ La note de "${resultat.nomMatiere}" n'a pas encore pu être enregistrée (connexion instable ou session expirée). ` +
        `Elle est conservée sur cet appareil et sera renvoyée automatiquement dès le rétablissement de la connexion.`,
        { duration: 15000 },
      );
    }
    // NOUVEAU MOTEUR QRC (examens branchés uniquement, via drapeau en base) :
    // chaque QRC répondue reçoit un identifiant unique et définitif. L'appel est
    // idempotent : double clic, F5, renvoi ou double finalisation ne peuvent pas
    // créer une deuxième QRC. Aucun effet sur les examens non branchés.
    if (saved) {
      try {
        const qrcItems = questionsSafe
          .filter((q: any) => String(q?.type || "").toUpperCase() === "QRC")
          .map((q: any) => ({
            question_id: q.id,
            reponse_eleve: safeQrcAnswerText(resultat.reponses?.[q.id] ?? resultat.reponses?.[String(q.id)]),
            points_max: getPointsParQuestion(matiere.id, "QRC", matiere),
          }))
          .filter((i) => i.reponse_eleve.trim().length > 0);
        if (qrcItems.length > 0) {
          await syncQrcInstances({
            apprenantId,
            quizId: examen.id,
            matiereId: resultat.matiereId,
            tentative: effectiveTentative,
            items: qrcItems,
          });
        }
      } catch (qrcError) {
        console.warn("[ExamSubmission][EB] Synchronisation QRC (nouveau moteur) impossible:", qrcError);
      }
    }

    return saved;
  };

  /**
   * Garde-fou anti double écriture : deux finalisations simultanées de la même
   * matière (double clic, réessai, deux requêtes en parallèle) partagent la
   * même promesse et ne produisent donc qu'un seul enregistrement.
   */
  const saveMatiereResult = async (args: { examen: ExamenBlanc; matiere: Matiere; resultat: ResultatMatiere; dureeSecondes: number }) => {
    if (!apprenantId) return saveMatiereResultInner(args);
    const key = buildFinalizationKey({
      apprenantId,
      quizType: args.examen.id.startsWith("bilan-") ? "bilan" : "examen_blanc",
      quizId: args.examen.id,
      matiereId: args.resultat.matiereId,
      tentative: Math.max(currentTentativeRef.current || currentTentative || 1, 1),
    });
    return runFinalizationOnce(key, () => saveMatiereResultInner(args));
  };


  const handleTerminerMatiere = async (reponses: Reponses) => {
    try {
      if (!examenChoisi) return;
      const matiere = examenChoisi.matieres[matiereIndex];
      if (!matiere) { toast.error("Matière introuvable. Veuillez relancer l'examen."); return; }

      // La matière a déjà été mise en file et confirmée par PassageMatiere.
      // On relit la base avant tout calcul de résultat : aucune progression si
      // les réponses confirmées ne correspondent pas exactement à l'écran.
      if (apprenantId && userId) {
        const exerciceKey =
          resumeExerciceIds[matiere.id] ||
          buildExamMatiereExerciceId(examenChoisi.id, matiere.id, currentTentative);

        const quizType = examenChoisi.id.startsWith("bilan-") ? "bilan" : "examen_blanc";
        const { data: confirmedRow, error: confirmationError } = await supabase
          .from("reponses_apprenants" as any)
          .select("reponses, completed")
          .eq("apprenant_id", apprenantId)
          .eq("exercice_id", exerciceKey)
          .maybeSingle();
        const confirmedAnswers = (confirmedRow as any)?.reponses ?? {};
        const confirmed = !confirmationError
          && Boolean((confirmedRow as any)?.completed)
          && answersAreEqual(confirmedAnswers, reponses);
        if (!confirmed) {
          toast.error(
            "Vos réponses sont encore en attente de confirmation. Elles restent conservées sur cet appareil.",
            { duration: 15000 },
          );
          return;
        }
      }

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
          // BUG #7 FIX: backup result to localStorage for recovery
          try {
            localStorage.setItem(
              `exam_result_backup_${examenChoisi.id}_${matiere.id}_${apprenantId}`,
              JSON.stringify(resultat)
            );
          } catch (_) {}
          // BLOCK progression: don't silently push past a matière whose score was NOT persisted.
          // Otherwise the apprenant may complete F/G while E remains "non terminée" après rechargement.
          newResultats[matiereIndex] = null as any;
          setTousResultats(newResultats);
          toast.error(
            "Impossible d'enregistrer votre résultat pour cette matière. Vérifiez votre connexion puis cliquez à nouveau sur « Terminer la matière ».",
            { duration: 8000 }
          );
          return;
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
        // BUG #2 FIX: purge any stale exam sessionStorage immediately on entering results phase
        try { sessionStorage.removeItem(EXAM_SESSION_KEY); } catch {}
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

  // BLOCAGE STRICT : aucune question tant que la version exacte n'est pas confirmée.
  if (phase === "selection" && !liveExamensLoaded) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className={liveExamensError ? "border-red-300" : undefined}>
          <CardContent className="py-10 text-center space-y-4">
            {liveExamensError ? (
              <>
                <AlertTriangle className="w-10 h-10 mx-auto text-red-600" />
                <p className="font-semibold text-red-700">{EXAM_CONTENT_UNAVAILABLE_MESSAGE}</p>
                <Button
                  onClick={() => { setLiveExamensError(false); void refreshLiveExamens({ force: true }); }}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Réessayer
                </Button>
              </>
            ) : (
              <>
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Chargement de la version officielle de l'examen…</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
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
          onStart={(examen, forceRetake) => handleStart(examen, forceRetake, null)}
          onStartPartial={(examen) => {
            const source = liveExamens.find((live) => live.id === examen.id) ?? examen;
            setExamenChoixMatieres(source);
            setMatieresSelectionnees([]);
            setPhase("choix-matieres");
          }}
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

  // ===== NOUVEAU MODE : choix des matières =====
  if (phase === "choix-matieres" && examenChoixMatieres) {
    const matieres = (examenChoixMatieres.matieres || []).filter(Boolean);
    const toggle = (id: string) =>
      setMatieresSelectionnees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    const dureeSelection = matieres
      .filter((m) => matieresSelectionnees.includes(m.id))
      .reduce((acc, m) => acc + (m.duree || 0), 0);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => { setExamenChoixMatieres(null); setPhase("selection"); }} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Choisir les matières à passer</CardTitle>
            <p className="text-sm text-muted-foreground">{examenChoixMatieres.titre}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sélectionnez uniquement les matières que vous souhaitez passer. Les questions, les réponses
              et la notation sont identiques au mode complet.
            </p>
            <div className="space-y-2">
              {matieres.map((m) => {
                const checked = matieresSelectionnees.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-3 w-full p-3 rounded-lg border cursor-pointer transition-colors ${checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-primary"
                      checked={checked}
                      onChange={() => toggle(m.id)}
                    />
                    <span className="flex-1 text-sm font-medium">{m.nom}</span>
                    <Badge variant="secondary" className="shrink-0">{m.duree} min</Badge>
                  </label>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
              <span>{matieresSelectionnees.length} matière{matieresSelectionnees.length > 1 ? "s" : ""} sélectionnée{matieresSelectionnees.length > 1 ? "s" : ""}</span>
              <span className="flex items-center gap-1"><Timer className="w-4 h-4" /> {dureeSelection} min</span>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                className="w-full gap-2"
                disabled={matieresSelectionnees.length === 0}
                onClick={() => {
                  const ordered = matieres.filter((m) => matieresSelectionnees.includes(m.id)).map((m) => m.id);
                  void handleStart(examenChoixMatieres, false, ordered);
                }}
              >
                Commencer les matières choisies <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setMatieresSelectionnees(matieres.map((m) => m.id))}
              >
                Tout sélectionner
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {examenChoisi.matieres.map((_, i) => {
                  const done = tousResultats[i] != null;
                  return <div key={i} className={`h-2 rounded-full transition-all ${done ? "w-8 bg-green-500" : i === matiereIndex ? "w-8 bg-primary" : "w-4 bg-muted"}`} />;
                })}
              </div>
              <span className="text-xs text-muted-foreground">Matière {matiereIndex + 1}/{examenChoisi.matieres.length}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => {
                const ok = window.confirm("Retour à la liste des examens ? Votre progression sur cet examen sera perdue.");
                if (!ok) return;
                try { sessionStorage.removeItem(EXAM_SESSION_KEY); } catch {}
                setExamenChoisi(null);
                setTousResultats([]);
                setMatiereIndex(0);
                setLastMatiereResult(null);
                setSelectionRefreshKey(k => k + 1);
                setPhase("selection");
              }}
            >
              <ArrowLeft className="w-4 h-4" /> Retour à la liste
            </Button>
          </div>
          <PassageMatiere key={`${examenChoisi.id}_${matiere.id}_t${currentTentative}`} matiere={matiere} numero={matiereIndex + 1} total={examenChoisi.matieres.length} onTerminer={handleTerminerMatiere} isBilan={examenChoisi.id.startsWith("bilan-")} apprenantId={apprenantId} userId={userId} examenId={examenChoisi.id} tentative={currentTentative} exerciceIdOverride={resumeExerciceIds[matiere.id]} onLearnerActivity={onLearnerActivity} />

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
    return (
      <RevisionPhaseView
        examenChoisi={examenChoisi}
        tousResultats={tousResultats}
        apprenantId={apprenantId}
        userId={userId}
        onRetour={() => setPhase("resultats")}
      />
    );
  }

  if (phase === "resultats" && examenChoisi) {
    return (
      <div className="max-w-3xl mx-auto">
        <EcranResultats examen={examenChoisi} resultats={tousResultats} onRecommencer={() => handleStart(examenChoisi, true)} onRetour={() => { setSelectionRefreshKey(k => k + 1); setPhase("selection"); }} onRefaireFausses={() => setPhase("revision")} apprenantId={apprenantId} userId={userId} isViewingSaved={isViewingSavedResults} isAdmin={isAdmin} canRetry={true} isPresentiel={isPresentiel} currentTentative={currentTentative} />
      </div>
    );
  }

  return null;
}

function RevisionPhaseView({
  examenChoisi,
  tousResultats,
  apprenantId,
  userId,
  onRetour,
}: {
  examenChoisi: ExamenBlanc;
  tousResultats: ResultatMatiere[];
  apprenantId: string;
  userId: string;
  onRetour: () => void;
}) {
  // Scroll to top on entry
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, []);

  const wrongQuestions: { matiere: Matiere; question: Question; matiereNom: string }[] = [];
  examenChoisi.matieres.forEach((matiere, mi) => {
    if (!matiere || matiere.id === "francais" || matiere.id === "bilan_francais") return;
    const r = tousResultats[mi];
    if (!r) return;
    const qSafe = (matiere.questions || []).filter((q): q is Question => !!q && q?.type !== undefined);
    const savedCorrectionsIA = r.correctionsIA || (r as any).details?.correctionsIA || {};
    qSafe.forEach((q) => {
      const rep = r.reponses?.[q.id] ?? r.reponses?.[String(q.id)];
      if (rep === undefined || rep === null || (Array.isArray(rep) && rep.length === 0) || (typeof rep === "string" && rep.trim() === "")) return;
      let isCorrect = false;
      if (q?.type === "QCM" && q.choix) {
        const correctes = safeArray<string>(q.choix?.filter((c) => c.correct).map((c) => c.lettre)).sort();
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
          motsCles.forEach((mc) => {
            const mcN = mc.toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, "");
            if (repStr.includes(mcN)) nbTrouvees++;
          });
          isCorrect = nbTrouvees >= motsCles.length;
        }
      }
      if (!isCorrect) wrongQuestions.push({ matiere, question: q, matiereNom: matiere.nom });
    });
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Message d'avertissement — TOUT EN HAUT */}
      <div className="rounded-lg px-4 py-4 bg-blue-50 border-2 border-blue-400 shadow-md">
        <p className="text-base font-bold text-blue-900">
          📖 Relisez vos erreurs avant de recommencer les questions fausses.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onRetour} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour aux résultats
        </Button>
        <h2 className="text-xl font-bold" style={{ color: "#0D2540" }}>
          🎯 Révision des questions fausses
        </h2>
      </div>
      <div className="rounded-lg px-4 py-3" style={{ backgroundColor: "#FFF3E0", border: "2px solid #F4A227" }}>
        <p className="text-sm font-semibold" style={{ color: "#D84315" }}>
          {wrongQuestions.length} question{wrongQuestions.length > 1 ? "s" : ""} à réviser (hors épreuve de Français)
        </p>
      </div>
      <RevisionFausses
        wrongQuestions={wrongQuestions}
        onTerminer={onRetour}
        apprenantId={apprenantId}
        userId={userId}
        examenId={examenChoisi.id}
      />
    </div>
  );
}
