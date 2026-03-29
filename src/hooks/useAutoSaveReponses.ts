import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const userIdRef = useRef<string | null>(null);
  const jwtTokenRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestReponsesRef = useRef<any>(null);

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
          .select("reponses, completed")
          .eq("apprenant_id", apprenantId)
          .eq("exercice_id", exerciceId)
          .maybeSingle();

        if (!error && data && !(data as any).completed) {
          setLoadedReponses((data as any).reponses as T);
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
      debounceRef.current = setTimeout(async () => {
        const latest = latestReponsesRef.current;
        if (!latest) return;

        try {
          // Always fetch fresh session before upsert
          const { data: { session } } = await supabase.auth.getSession();

          if (!session?.user?.id) {
            console.warn("[AutoSaveReponses] Pas de session active, attente…");
            const freshSession = await waitForSession();
            if (!freshSession) {
              console.error("[AutoSaveReponses] ABANDON — impossible d'obtenir une session après 5s", {
                exercice_id: exerciceId,
                apprenant_id: apprenantId,
              });
              return;
            }
            // Update refs with restored session
            userIdRef.current = freshSession.user.id;
            jwtTokenRef.current = freshSession.access_token;
          } else {
            // Keep refs in sync
            userIdRef.current = session.user.id;
            jwtTokenRef.current = session.access_token;
          }

          const activeUserId = userIdRef.current!;

          console.log("[AutoSaveReponses] UPSERT reponses_apprenants — user_id envoyé:", activeUserId, "| auth session uid:", userIdRef.current, "| exercice_id:", exerciceId, "| apprenant_id:", apprenantId);

          const { error } = await supabase
            .from("reponses_apprenants" as any)
            .upsert(
              {
                apprenant_id: apprenantId,
                user_id: activeUserId,
                exercice_id: exerciceId,
                exercice_type: exerciceType,
                reponses: latest.reponses,
                score: latest.score ?? null,
                completed: latest.completed ?? false,
                updated_at: new Date().toISOString(),
              } as any,
              { onConflict: "apprenant_id,exercice_id" }
            );

          if (error) {
            console.error("[AutoSaveReponses] Upsert error COMPLET:", {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: (error as any).hint,
              status: (error as any).status,
              statusText: (error as any).statusText,
              exercice_id: exerciceId,
              apprenant_id: apprenantId,
              user_id: activeUserId,
            });
          }
        } catch (e) {
          console.error("[AutoSaveReponses] Save error:", e);
        }
      }, 300);
    },
    [apprenantId, exerciceId, exerciceType]
  );

  // Mark as completed
  const markCompleted = useCallback(
    (reponses: any, score?: number | null) => {
      saveReponses(reponses, score, true);
    },
    [saveReponses]
  );

  // beforeunload: flush pending save synchronously
  useEffect(() => {
    const flushSave = () => {
      if (!apprenantId || !userIdRef.current) return;
      const latest = latestReponsesRef.current;
      if (!latest) return;

      // Use the latest known token — already kept in sync by onAuthStateChange
      const token = jwtTokenRef.current;
      if (!token) {
        console.warn("[AutoSaveReponses] FLUSH skipped — no JWT token available");
        return;
      }

      const row = {
        apprenant_id: apprenantId,
        user_id: userIdRef.current,
        exercice_id: exerciceId,
        exercice_type: exerciceType,
        reponses: latest.reponses,
        score: latest.score ?? null,
        completed: latest.completed ?? false,
        updated_at: new Date().toISOString(),
      };
      try {
        console.log("[AutoSaveReponses] FLUSH XHR reponses_apprenants — user_id:", userIdRef.current, "| exercice_id:", exerciceId);
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/reponses_apprenants?on_conflict=apprenant_id,exercice_id`;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, false);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("Prefer", "resolution=merge-duplicates");
        xhr.send(JSON.stringify([row]));
      } catch (_) {}
    };
    window.addEventListener("beforeunload", flushSave);
    return () => {
      window.removeEventListener("beforeunload", flushSave);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [apprenantId, exerciceId, exerciceType]);

  return { loadedReponses, isLoaded, saveReponses, markCompleted };
}
