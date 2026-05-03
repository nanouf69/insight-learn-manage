import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SessionCheckEvent = "heartbeat" | "action" | "confirm_presence";

interface SessionCheckRow {
  is_valid: boolean;
  disconnect_reason: string | null;
  should_show_presence_prompt: boolean;
  remaining_presence_seconds: number;
  server_now: string;
  session_started_at: string | null;
}

interface UseConnexionTrackingParams {
  apprenantId: string | null;
  userId: string | null;
  enabled: boolean;
}

export function useConnexionTracking({ apprenantId, userId, enabled }: UseConnexionTrackingParams) {
  const connexionIdRef = useRef<string | null>(null);
  const [connexionId, setConnexionId] = useState<string | null>(null);

  const resetLocalSession = useCallback(() => {
    connexionIdRef.current = null;
    setConnexionId(null);
  }, []);

  const closeConnexionServerSide = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc("close_apprenant_connexion" as any, {
        _connexion_id: id,
        _apprenant_id: apprenantId,
      });

      if (error) {
        console.error("close_apprenant_connexion error:", error);
      }
    },
    [apprenantId],
  );

  const endConnexion = useCallback(async () => {
    if (!connexionIdRef.current) return;

    await closeConnexionServerSide(connexionIdRef.current);

    resetLocalSession();
  }, [closeConnexionServerSide, resetLocalSession]);

  const checkSessionOnServer = useCallback(
    async (event: SessionCheckEvent): Promise<SessionCheckRow | null> => {
      if (!enabled || !apprenantId || !userId || !connexionIdRef.current) return null;

      const { data, error } = await supabase.rpc("check_apprenant_session" as any, {
        _apprenant_id: apprenantId,
        _connexion_id: connexionIdRef.current,
        _event: event,
      });

      if (error) {
        console.error("Session check error:", error);
        return null;
      }

      const row = (Array.isArray(data) ? data[0] : null) as SessionCheckRow | null;
      if (!row) return null;

      return row;
    },
    [enabled, apprenantId, userId],
  );

  useEffect(() => {
    if (!enabled || !apprenantId || !userId) {
      resetLocalSession();
      return;
    }

    let cancelled = false;

    const startConnexion = async () => {
      const { data, error } = await supabase.rpc("start_apprenant_connexion" as any, {
        _apprenant_id: apprenantId,
        _source: "cours",
      });

      if (cancelled || error || !data) return;

      const startedConnexion = Array.isArray(data) ? data[0] : data;
      if (!startedConnexion?.id) return;

      connexionIdRef.current = startedConnexion.id;
      setConnexionId(startedConnexion.id);

      const { data: apprenantData } = await supabase
        .from("apprenants")
        .select("nom, prenom, formation_choisie, type_apprenant")
        .eq("id", apprenantId)
        .maybeSingle();

      if (cancelled || !apprenantData) return;

      const nom = `${apprenantData.prenom} ${apprenantData.nom}`;
      const formation = apprenantData.type_apprenant || apprenantData.formation_choisie || "";
      await supabase.from("alertes_systeme").insert({
        type: "connexion_apprenant",
        titre: `🟢 ${nom} vient de se connecter`,
        message: `L'apprenant ${nom} s'est connecté à son espace de cours${formation ? ` (${formation.toUpperCase()})` : ""}.`,
        details: `Connexion le ${new Date().toLocaleString("fr-FR")}`,
      });
    };

    void startConnexion();

    const handleBeforeUnload = () => {
      void endConnexion();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void endConnexion();
    };
  }, [enabled, apprenantId, userId, closeConnexionServerSide, endConnexion, resetLocalSession]);

  const trackModuleActivity = async (
    moduleId: number,
    moduleNom: string,
    actionType: string = "open_module",
    metadata: Record<string, any> = {},
  ) => {
    if (!apprenantId || !userId || !connexionIdRef.current) return;

    const validation = await checkSessionOnServer("action");
    if (validation && !validation.is_valid) {
      const reason = validation.disconnect_reason || "";
      // Skip signOut for benign reasons (double-mount, replaced session, etc.)
      if (reason !== "replaced_by_new_session" && reason !== "no_active_session" && reason !== "already_closed") {
        console.error(`[ConnexionTracking] Déconnexion (signOut) — raison: ${reason}`);
        await endConnexion();
        await supabase.auth.signOut();
      } else {
        console.warn(`[ConnexionTracking] Session invalide ignorée — raison bénigne: ${reason}`);
      }
      return;
    }

    // Update current_module on the connexion row
    if (actionType === "open_module") {
      await supabase
        .from("apprenant_connexions" as any)
        .update({ current_module: moduleNom } as any)
        .eq("id", connexionIdRef.current);
    }

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

  return {
    trackModuleActivity,
    connexionId,
    endConnexion,
  };
}
