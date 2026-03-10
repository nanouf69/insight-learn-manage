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
      // Close any existing active sessions for this student (single-session enforcement)
      await supabase
        .from("apprenant_connexions" as any)
        .update({ ended_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
        .eq("apprenant_id", apprenantId)
        .is("ended_at", null);

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

      // Fetch apprenant name for the alert
      const { data: apprenantData } = await supabase
        .from("apprenants")
        .select("nom, prenom, formation_choisie, type_apprenant")
        .eq("id", apprenantId)
        .maybeSingle();

      if (apprenantData) {
        const nom = `${apprenantData.prenom} ${apprenantData.nom}`;
        const formation = apprenantData.type_apprenant || apprenantData.formation_choisie || "";
        await supabase
          .from("alertes_systeme")
          .insert({
            type: "connexion_apprenant",
            titre: `🟢 ${nom} vient de se connecter`,
            message: `L'apprenant ${nom} s'est connecté à son espace de cours${formation ? ` (${formation.toUpperCase()})` : ""}.`,
            details: `Connexion le ${new Date().toLocaleString("fr-FR")}`,
          });
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
