import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { submitQuizAttempt } from "@/lib/quizAttempts";
import { enqueueAnswerSave, flushAnswerSavesAndWait, flushAnswerSavesOnUnload, mergeSavedAndPendingAnswers, type AnswerSavePayload } from "@/lib/answerPersistence";

interface UseAutoSaveReponsesOptions {
  apprenantId: string | null | undefined;
  exerciceId: string;
  exerciceType: string; // 'quiz' | 'examen_blanc' | 'bilan' | 'qrc'
}

/**
 * Waits up to ~5s for a valid Supabase session to be available.
 * Returns the session or null if timeout.
 */
async function waitForSession(maxAttempts = 10, delayMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.id) {
      return data.session;
    }
    console.warn(`[AutoSaveReponses] Session not ready, attempt ${i + 1}/${maxAttempts}…`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

/**
 * Hook for auto-saving quiz/exam responses to `reponses_apprenants`.
 * - Saves on every onChange (debounced 300ms)
 * - Loads saved responses on mount
 * - Flushes on beforeunload
 * - Silent (no toasts/spinners)
 */
export function useAutoSaveReponses<T = Record<string, any>>({
  apprenantId,
  exerciceId,
  exerciceType,
}: UseAutoSaveReponsesOptions) {
  const [loadedReponses, setLoadedReponses] = useState<T | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const jwtTokenRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestReponsesRef = useRef<any>(null);
  // FIRST-ANSWER FIX: flush immediately on the very first save so a single answer
  // is persisted to DB even if the user closes the tab right after.
  const hasSavedOnceRef = useRef(false);

  // Get user ID and JWT once — and keep them fresh via onAuthStateChange
  useEffect(() => {
    const updateRefs = (session: any) => {
      userIdRef.current = session?.user?.id ?? null;
      jwtTokenRef.current = session?.access_token ?? null;
    };

    supabase.auth.getSession().then(({ data }) => updateRefs(data.session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      updateRefs(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load saved responses on mount
  useEffect(() => {
    if (!apprenantId || !exerciceId) {
      setIsLoaded(true);
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase
          .from("reponses_apprenants" as any)
          .select("reponses, completed, status, submitted_at")
          .eq("apprenant_id", apprenantId)
          .eq("exercice_id", exerciceId)
          .maybeSingle();

        if (!error && data) {
          setIsSubmitted(((data as any).status ?? ((data as any).completed ? "submitted" : "in_progress")) === "submitted");
        }
        // Règle générale : on recharge TOUJOURS les réponses (même sur une
        // ligne terminée ou vide) et les réponses locales encore en attente
        // gagnent, sans qu'une valeur vide puisse en masquer une.
        {
          const merged = mergeSavedAndPendingAnswers(
            (!error ? ((data as any)?.reponses ?? {}) : {}) as any,
            apprenantId,
            exerciceId,
          );
          if (Object.keys(merged).length > 0) setLoadedReponses(merged as T);
          if (!error && data) hasSavedOnceRef.current = true;
        }

      } catch (e) {
        console.error("[AutoSaveReponses] Load error:", e);
      }
      setIsLoaded(true);
    })();
  }, [apprenantId, exerciceId]);

  // Save function - called on every answer change
  const saveReponses = useCallback(
    (reponses: any, score?: number | null, completed?: boolean) => {
      if (!apprenantId) return;

      latestReponsesRef.current = { reponses, score, completed };

      if (debounceRef.current) clearTimeout(debounceRef.current);
      const latest = latestReponsesRef.current;
      if (!latest) return;

        const payload: AnswerSavePayload = {
          apprenant_id: apprenantId,
          user_id: userIdRef.current || undefined,
          exercice_id: exerciceId,
          exercice_type: exerciceType,
          reponses: latest.reponses,
          completed: latest.completed ?? false,
          updated_at: new Date().toISOString(),
        };

        // Only include score when explicitly provided — never send null
        // to avoid overwriting an existing score in the DB
        if (latest.score !== undefined && latest.score !== null) {
          payload.score = latest.score;
        }

      enqueueAnswerSave(payload);
      hasSavedOnceRef.current = true;
    },
    [apprenantId, exerciceId, exerciceType]
  );

  // Mark as completed — VALIDATION DÉFINITIVE côté serveur.
  // On passe par la RPC submit_quiz_attempt (status='submitted' + submitted_at),
  // avec repli sur l'ancienne voie si la RPC échoue.
  const markCompleted = useCallback(
    async (reponses: any, score?: number | null) => {
      if (!apprenantId) return false;
      saveReponses(reponses, score, false);
      const flushed = await flushAnswerSavesAndWait(apprenantId, exerciceId);
      if (!flushed) return false;
      const submitted = await submitQuizAttempt({
        apprenantId,
        exerciceId,
        exerciceType,
        reponses: reponses ?? {},
        score: score ?? null,
      });
      if (!submitted) {
        saveReponses(reponses, score, true);
        return false;
      }
      hasSavedOnceRef.current = true;
      return true;
    },
    [apprenantId, exerciceId, exerciceType, saveReponses]
  );

  // beforeunload : on ne contourne PLUS le moteur central (l'ancien envoi XHR
  // direct ignorait le contrôle d'antériorité `base_seq`). On se contente de
  // pousser la file durable, qui applique les mêmes protections que partout.
  useEffect(() => {
    const flushSave = () => {
      if (!apprenantId) return;
      flushAnswerSavesOnUnload();
    };
    window.addEventListener("beforeunload", flushSave);
    window.addEventListener("pagehide", flushSave);
    return () => {
      window.removeEventListener("beforeunload", flushSave);
      window.removeEventListener("pagehide", flushSave);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [apprenantId]);


  return { loadedReponses, isLoaded, isSubmitted, saveReponses, markCompleted };
}
