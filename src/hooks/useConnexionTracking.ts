import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_INTERVAL = 60_000; // 1 minute

interface UseConnexionTrackingParams {
  apprenantId: string | null;
  userId: string | null;
  enabled: boolean;
}

export function useConnexionTracking({ apprenantId, userId, enabled }: UseConnexionTrackingParams) {
  const connexionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !apprenantId || !userId) return;

    let heartbeatTimer: ReturnType<typeof setInterval>;

    const startConnexion = async () => {
      const { data, error } = await supabase
        .from("apprenant_connexions" as any)
        .insert({
          apprenant_id: apprenantId,
          user_id: userId,
          source: "cours",
        })
        .select("id")
        .single();

      if (!error && data) {
        connexionIdRef.current = (data as any).id;
      }
    };

    const heartbeat = async () => {
      if (!connexionIdRef.current) return;
      await supabase
        .from("apprenant_connexions" as any)
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", connexionIdRef.current);
    };

    const endConnexion = async () => {
      if (!connexionIdRef.current) return;
      await supabase
        .from("apprenant_connexions" as any)
        .update({
          ended_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", connexionIdRef.current);
      connexionIdRef.current = null;
    };

    startConnexion();
    heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    const handleBeforeUnload = () => {
      if (connexionIdRef.current) {
        const body = JSON.stringify({
          ended_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        });
        // Use sendBeacon for reliability on page close
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/apprenant_connexions?id=eq.${connexionIdRef.current}`,
          // sendBeacon doesn't support PATCH easily, so we'll rely on the heartbeat + ended_at from cleanup
        );
        // Fallback: try sync update
        endConnexion();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      endConnexion();
    };
  }, [enabled, apprenantId, userId]);

  const trackModuleActivity = async (
    moduleId: number,
    moduleNom: string,
    actionType: string = "open_module",
    metadata: Record<string, any> = {}
  ) => {
    if (!apprenantId || !userId) return;
    await supabase
      .from("apprenant_module_activites" as any)
      .insert({
        apprenant_id: apprenantId,
        user_id: userId,
        connexion_id: connexionIdRef.current,
        module_id: moduleId,
        module_nom: moduleNom,
        action_type: actionType,
        metadata,
      });
  };

  return { trackModuleActivity, connexionId: connexionIdRef };
}
