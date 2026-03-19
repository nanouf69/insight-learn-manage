import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const MAX_SESSION_MS = 7 * 60 * 60 * 1000;

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
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  const resetLocalSession = useCallback(() => {
    connexionIdRef.current = null;
    setSessionStartTime(null);
    sessionStartRef.current = null;
  }, []);

  const endConnexion = useCallback(async () => {
    if (!connexionIdRef.current) return;

    const now = Date.now();
    const maxEndAt = sessionStartRef.current ? sessionStartRef.current + MAX_SESSION_MS : now;
    const safeEndAt = new Date(Math.min(now, maxEndAt)).toISOString();

    await supabase
      .from("apprenant_connexions" as any)
      .update({
        ended_at: safeEndAt,
        last_seen_at: safeEndAt,
      })
      .eq("id", connexionIdRef.current)
      .is("ended_at", null);

    resetLocalSession();
  }, [resetLocalSession]);

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

      if (row.session_started_at) {
        const parsedStart = new Date(row.session_started_at).getTime();
        if (Number.isFinite(parsedStart)) {
          sessionStartRef.current = parsedStart;
          setSessionStartTime(parsedStart);
        }
      }

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
      const nowIso = new Date().toISOString();

      const { data: activeSessions } = await supabase
        .from("apprenant_connexions" as any)
        .select("id, started_at")
        .eq("apprenant_id", apprenantId)
        .eq("user_id", userId)
        .is("ended_at", null);

      if (activeSessions?.length) {
        await Promise.all(
          activeSessions.map((session: any) => {
            const startedAtMs = new Date(session.started_at).getTime();
            const cappedEndAtMs = Number.isFinite(startedAtMs)
              ? Math.min(Date.now(), startedAtMs + MAX_SESSION_MS)
              : Date.now();
            return supabase
              .from("apprenant_connexions" as any)
              .update({
                ended_at: new Date(cappedEndAtMs).toISOString(),
                last_seen_at: new Date(cappedEndAtMs).toISOString(),
              })
              .eq("id", session.id)
              .is("ended_at", null);
          }),
        );
      }

      const { data, error } = await supabase
        .from("apprenant_connexions" as any)
        .insert({
          apprenant_id: apprenantId,
          user_id: userId,
          source: "cours",
        })
        .select("id, started_at")
        .single();

      if (cancelled || error || !data) return;

      const startedAtMs = new Date((data as any).started_at).getTime();
      connexionIdRef.current = (data as any).id;
      if (Number.isFinite(startedAtMs)) {
        sessionStartRef.current = startedAtMs;
        setSessionStartTime(startedAtMs);
      }

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
        details: `Connexion le ${new Date(nowIso).toLocaleString("fr-FR")}`,
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
  }, [enabled, apprenantId, userId, endConnexion, resetLocalSession]);

  const trackModuleActivity = async (
    moduleId: number,
    moduleNom: string,
    actionType: string = "open_module",
    metadata: Record<string, any> = {},
  ) => {
    if (!apprenantId || !userId || !connexionIdRef.current) return;

    const validation = await checkSessionOnServer("action");
    if (validation && !validation.is_valid) {
      resetLocalSession();
      await supabase.auth.signOut();
      return;
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
    connexionId: connexionIdRef,
    sessionStartTime,
    endConnexion,
  };
}
