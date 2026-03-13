import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseAutoSaveReponsesOptions {
  apprenantId: string | null | undefined;
  exerciceId: string;
  exerciceType: string; // 'quiz' | 'examen_blanc' | 'bilan' | 'qrc'
}

/**
 * Hook for auto-saving quiz/exam responses to `reponses_apprenants`.
 * - Saves on every onChange (debounced 500ms to avoid flooding)
 * - Loads saved responses on mount
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestReponsesRef = useRef<any>(null);

  // Get user ID once
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null;
    });
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
      if (!apprenantId || !userIdRef.current) return;

      latestReponsesRef.current = { reponses, score, completed };

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const latest = latestReponsesRef.current;
        if (!latest) return;

        try {
          const { error } = await supabase
            .from("reponses_apprenants" as any)
            .upsert(
              {
                apprenant_id: apprenantId,
                user_id: userIdRef.current,
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
            console.error("[AutoSaveReponses] Upsert error:", error);
          }
        } catch (e) {
          console.error("[AutoSaveReponses] Save error:", e);
        }
      }, 500);
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { loadedReponses, isLoaded, saveReponses, markCompleted };
}
