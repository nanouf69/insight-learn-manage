import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const CLIENT_SESSION_STORAGE_KEY = "cours_client_session_id";

function getClientSessionId(): string {
  try {
    let id = sessionStorage.getItem(CLIENT_SESSION_STORAGE_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem(CLIENT_SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function useConnexionTracking({ apprenantId, userId, enabled }: UseConnexionTrackingParams) {
  const connexionIdRef = useRef<string | null>(null);
  const startingRef = useRef(false);
  const [connexionId, setConnexionId] = useState<string | null>(null);
  const [alreadyConnected, setAlreadyConnected] = useState(false);
  const [otherSessionInfo, setOtherSessionInfo] = useState<{
    ip_address: string | null;
    user_agent: string | null;
    started_at: string | null;
    last_seen_at: string | null;
    source: string | null;
  } | null>(null);

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
      if (connexionIdRef.current || startingRef.current) return;
      startingRef.current = true;
      const { data, error } = await supabase.rpc("start_apprenant_connexion" as any, {
        _apprenant_id: apprenantId,
        _source: "cours",
        _client_session_id: getClientSessionId(),
      });
      startingRef.current = false;

      if (cancelled) return;
      if (error) {
        const msg = (error as any)?.message || "";
        if (msg.includes("already_connected")) {
          setAlreadyConnected(true);
        }
        return;
      }
      if (!data) return;

      const startedConnexion = Array.isArray(data) ? data[0] : data;
      if (!startedConnexion?.id) return;

      connexionIdRef.current = startedConnexion.id;
      setConnexionId(startedConnexion.id);

      // Capture client IP (best-effort, non-blocking)
      (async () => {
        try {
          const res = await fetch("https://api.ipify.org?format=json");
          if (!res.ok) return;
          const { ip } = await res.json();
          if (!ip || cancelled || !connexionIdRef.current) return;
          await supabase
            .from("apprenant_connexions" as any)
            .update({ ip_address: ip } as any)
            .eq("id", connexionIdRef.current);
        } catch (e) {
          console.warn("[ConnexionTracking] IP capture failed", e);
        }
      })();

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

    return () => {
      cancelled = true;
      startingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, apprenantId, userId]);

  const trackModuleActivity = useCallback(async (
    moduleId: number,
    moduleNom: string,
    actionType: string = "open_module",
    metadata: Record<string, any> = {},
  ) => {
    if (!apprenantId || !userId || !connexionIdRef.current) return;

    const validation = await checkSessionOnServer("action");
    if (validation && !validation.is_valid) {
      const reason = validation.disconnect_reason || "";
      console.warn(`[ConnexionTracking] Session de suivi expirée sans déconnecter l'apprenant — raison: ${reason}`);
      return;
    }

    // Update current_module on the connexion row for any navigation action
    if (actionType === "open_module" || actionType === "open_cours" || actionType === "open_section") {
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
  }, [apprenantId, checkSessionOnServer, endConnexion, userId]);

  const markActivity = useCallback(async (): Promise<boolean> => {
    if (!apprenantId || !userId || !connexionIdRef.current) return false;

    const validation = await checkSessionOnServer("action");
    if (validation && !validation.is_valid) {
      const reason = validation.disconnect_reason || "";
      console.warn(`[ConnexionTracking] Activité quiz ignorée — session de suivi expirée sans déconnecter l'apprenant — raison: ${reason}`);
      return false;
    }
    return true;
  }, [apprenantId, checkSessionOnServer, userId]);

  return {
    trackModuleActivity,
    markActivity,
    connexionId,
    endConnexion,
    alreadyConnected,
  };
}
