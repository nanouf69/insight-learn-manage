import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Mesure le temps passé par question côté apprenant.
 *
 * Principe : on attribue à une question le temps écoulé depuis la dernière
 * interaction pédagogique observée (réponse précédente, arrivée sur l'exercice).
 * Le délai est plafonné (MAX_SECONDS) pour ne pas comptabiliser les pauses,
 * et plancher à 1 seconde.
 *
 * Ce suivi est purement additif : il n'écrit QUE dans apprenant_question_temps
 * et ne touche jamais aux réponses, scores, tentatives ou progressions.
 */

const MAX_SECONDS = 300; // au-delà de 5 min on considère une pause
const FLUSH_INTERVAL_MS = 20000;

export interface QuestionTimeEvent {
  moduleId?: number | null;
  moduleNom?: string | null;
  exerciceId?: string | null;
  questionKey: string;
  questionNum?: number | null;
  answered?: boolean;
  correct?: boolean | null;
}

interface PendingRow {
  apprenant_id: string;
  user_id: string | null;
  module_id: number | null;
  module_nom: string | null;
  exercice_id: string | null;
  question_key: string;
  question_num: number | null;
  seconds: number;
  answered: boolean;
  correct: boolean | null;
  occurred_at: string;
}

export function useQuestionTimeTracking(apprenantId?: string | null) {
  const queueRef = useRef<PendingRow[]>([]);
  const lastTickRef = useRef<number>(Date.now());
  const lastKeyRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) userIdRef.current = data.user?.id ?? null;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const flush = useCallback(async () => {
    const rows = queueRef.current;
    if (rows.length === 0) return;
    queueRef.current = [];
    try {
      await supabase.from("apprenant_question_temps" as any).insert(rows as any);
    } catch (_) {
      // suivi non bloquant : on abandonne silencieusement
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);
    const onHide = () => {
      void flush();
    };
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(timer);
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [flush]);

  /** Réinitialise le chrono (entrée sur un exercice, changement de page). */
  const resetTimer = useCallback(() => {
    lastTickRef.current = Date.now();
    lastKeyRef.current = null;
  }, []);

  const trackQuestion = useCallback(
    (ev: QuestionTimeEvent) => {
      if (!apprenantId) return;
      const now = Date.now();
      const elapsed = Math.round((now - lastTickRef.current) / 1000);
      lastTickRef.current = now;

      // Une saisie répétée sur la même question (QRC, changement de choix)
      // ne crée pas une nouvelle ligne toutes les millisecondes.
      if (lastKeyRef.current === ev.questionKey && elapsed < 2) return;
      lastKeyRef.current = ev.questionKey;

      const seconds = Math.min(MAX_SECONDS, Math.max(1, elapsed));
      queueRef.current.push({
        apprenant_id: apprenantId,
        user_id: userIdRef.current,
        module_id: ev.moduleId ?? null,
        module_nom: ev.moduleNom ?? null,
        exercice_id: ev.exerciceId ?? null,
        question_key: ev.questionKey,
        question_num: ev.questionNum ?? null,
        seconds,
        answered: ev.answered ?? true,
        correct: ev.correct ?? null,
        occurred_at: new Date(now).toISOString(),
      });
      if (queueRef.current.length >= 20) void flush();
    },
    [apprenantId, flush],
  );

  return { trackQuestion, resetTimer, flushQuestionTimes: flush };
}
