import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COUNTDOWN_TICK_MS = 1000;
const POLL_INTERVAL_MS = 15_000;
const ACTION_CHECK_THROTTLE_MS = 20_000;

interface ServerSessionCheck {
  is_valid: boolean;
  disconnect_reason: string | null;
  should_show_presence_prompt: boolean;
  remaining_presence_seconds: number;
  server_now: string;
  session_started_at: string | null;
}

interface UsePresenceCheckParams {
  apprenantId: string | null;
  userId: string | null;
  connexionId: string | null;
  enabled: boolean;
  onForceDisconnect: () => void;
  /** When true, all automatic heartbeat polling and activity checks are paused (e.g. during an exam) */
  pauseDuringExam?: boolean;
}

export function usePresenceCheck({
  apprenantId,
  userId,
  connexionId,
  enabled,
  onForceDisconnect,
  pauseDuringExam = false,
}: UsePresenceCheckParams) {
  const [showModal, setShowModal] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(600);
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modalDeadlineRef = useRef<number | null>(null);
  const endingRef = useRef(false);
  const promptLoggedRef = useRef(false);
  const lastActionCheckAtRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    pollRef.current = null;
    countdownRef.current = null;
  }, []);

  const runServerCheck = useCallback(
    async (event: "heartbeat" | "action" | "confirm_presence" = "heartbeat"): Promise<ServerSessionCheck | null> => {
      if (!enabled || !apprenantId || !userId || !connexionId) return null;

      const { data, error } = await supabase.rpc("check_apprenant_session" as any, {
        _apprenant_id: apprenantId,
        _connexion_id: connexionId,
        _event: event,
      });

      if (error) {
        console.error("Presence check RPC error:", error);
        return null;
      }

      return (Array.isArray(data) ? data[0] : null) as ServerSessionCheck | null;
    },
    [enabled, apprenantId, userId, connexionId],
  );

  const endSession = useCallback(
    async (reason: string) => {
      if (endingRef.current) return;
      endingRef.current = true;
      clearTimers();
      setShowModal(false);
      modalDeadlineRef.current = null;
      setDisconnectReason(reason);

      if (connexionId) {
        await supabase.rpc("close_apprenant_connexion" as any, {
          _connexion_id: connexionId,
          _apprenant_id: apprenantId,
        });
      }

      await onForceDisconnect();
    },
    [apprenantId, clearTimers, connexionId, onForceDisconnect],
  );

  const handleServerValidation = useCallback(
    async (event: "heartbeat" | "action" | "confirm_presence" = "heartbeat") => {
      if (endingRef.current) return;

      const validation = await runServerCheck(event);
      if (!validation) return;

      if (!validation.is_valid) {
        await endSession(validation.disconnect_reason || "max_duration");
        return;
      }

      if (validation.should_show_presence_prompt) {
        const remaining = Math.max(0, validation.remaining_presence_seconds || 0);
        setShowModal(true);
        setCountdownSeconds(remaining);
        modalDeadlineRef.current = Date.now() + remaining * 1000;

        if (!promptLoggedRef.current) {
          promptLoggedRef.current = true;
          toast.info("Êtes-vous là ? Merci de confirmer votre présence.", {
            duration: 8000,
            position: "top-center",
          });

          await supabase.from("apprenant_module_activites" as any).insert({
            apprenant_id: apprenantId,
            user_id: userId,
            connexion_id: connexionId,
            module_id: 0,
            module_nom: "Système",
            action_type: "presence_check_30m",
            metadata: { source: "server_session_check" },
          });
        }
      } else {
        setShowModal(false);
        modalDeadlineRef.current = null;
        promptLoggedRef.current = false;
      }
    },
    [apprenantId, connexionId, endSession, runServerCheck, userId],
  );

  const confirmPresence = useCallback(async () => {
    const validation = await runServerCheck("confirm_presence");

    if (!validation || !validation.is_valid) {
      await endSession(validation?.disconnect_reason || "no_response");
      return;
    }

    promptLoggedRef.current = false;
    setShowModal(false);
    modalDeadlineRef.current = null;
    setCountdownSeconds(600);
    lastActionCheckAtRef.current = Date.now();
  }, [endSession, runServerCheck]);

  useEffect(() => {
    if (!enabled || !apprenantId || !userId || !connexionId || pauseDuringExam) {
      clearTimers();
      if (!pauseDuringExam) {
        endingRef.current = false;
        promptLoggedRef.current = false;
        setShowModal(false);
        modalDeadlineRef.current = null;
      }
      return;
    }

    endingRef.current = false;
    void handleServerValidation("heartbeat");

    pollRef.current = setInterval(() => {
      void handleServerValidation("heartbeat");
    }, POLL_INTERVAL_MS);

    return () => {
      clearTimers();
    };
  }, [enabled, apprenantId, userId, connexionId, clearTimers, handleServerValidation, pauseDuringExam]);

  useEffect(() => {
    if (!enabled || !apprenantId || !userId || !connexionId || pauseDuringExam) return;

    const runHeartbeatCheck = () => {
      void handleServerValidation("heartbeat");
    };

    const runActionCheck = () => {
      const now = Date.now();
      if (now - lastActionCheckAtRef.current < ACTION_CHECK_THROTTLE_MS) return;
      lastActionCheckAtRef.current = now;
      void handleServerValidation("action");
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runHeartbeatCheck();
      }
    };

    window.addEventListener("focus", runHeartbeatCheck);
    window.addEventListener("online", runHeartbeatCheck);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const activityEvents: Array<keyof WindowEventMap> = ["click", "keydown", "touchstart", "pointerdown"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, runActionCheck));

    return () => {
      window.removeEventListener("focus", runHeartbeatCheck);
      window.removeEventListener("online", runHeartbeatCheck);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, runActionCheck));
    };
  }, [enabled, apprenantId, userId, connexionId, handleServerValidation, pauseDuringExam]);

  useEffect(() => {
    if (!showModal || !modalDeadlineRef.current) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = null;
      return;
    }

    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((modalDeadlineRef.current! - Date.now()) / 1000));
      setCountdownSeconds(remaining);

      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        void endSession("no_response");
      }
    }, COUNTDOWN_TICK_MS);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = null;
    };
  }, [showModal, endSession]);

  return {
    showModal,
    countdownSeconds,
    disconnectReason,
    confirmPresence,
  };
}
