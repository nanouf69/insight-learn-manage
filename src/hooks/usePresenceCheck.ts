import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


const ACTION_CHECK_THROTTLE_MS = 20_000;
const PRESENCE_PROMPT_SNOOZE_MS = 30 * 60 * 1000;

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
  /**
   * When true, presence polling is paused (no heartbeats, no prompts).
   * When transitioning from true→false, a confirm_presence is sent automatically
   * to reset the rolling window and prevent immediate disconnect.
   */
  isInExam?: boolean;
  /** @deprecated Use isInExam instead */
  pauseDuringExam?: boolean;
}

export function usePresenceCheck({
  apprenantId,
  userId,
  connexionId,
  enabled,
  onForceDisconnect,
  isInExam: isInExamProp,
  pauseDuringExam,
}: UsePresenceCheckParams) {
  // Support both isInExam and legacy pauseDuringExam
  const isInExam = isInExamProp ?? pauseDuringExam ?? false;

  const [showModal, setShowModal] = useState(false);
  // Deadline timestamp (ms). Pas de tick state ici — c'est le modal isolé
  // qui calcule lui-même la seconde affichée pour ne pas re-render le parent.
  const [countdownDeadline, setCountdownDeadline] = useState<number | null>(null);
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalDeadlineRef = useRef<number | null>(null);
  const endingRef = useRef(false);
  const promptLoggedRef = useRef(false);
  const lastActionCheckAtRef = useRef(0);
  const suppressPromptUntilRef = useRef(0);
  const wasInExamRef = useRef(isInExam);

  // Stabilise onForceDisconnect pour éviter que les setInterval/setTimeout
  // se reconstruisent quand le parent passe une nouvelle référence à chaque render.
  const onForceDisconnectRef = useRef(onForceDisconnect);
  useEffect(() => {
    onForceDisconnectRef.current = onForceDisconnect;
  }, [onForceDisconnect]);

  const clearTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    pollRef.current = null;
    expiryTimerRef.current = null;
  }, []);

  const runServerCheck = useCallback(
    async (event: "heartbeat" | "heartbeat_exam" | "action" | "confirm_presence" = "heartbeat"): Promise<ServerSessionCheck | null> => {
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
      setCountdownDeadline(null);
      setDisconnectReason(reason);

      if (connexionId) {
        await supabase.rpc("close_apprenant_connexion" as any, {
          _connexion_id: connexionId,
          _apprenant_id: apprenantId,
        });
      }

      await onForceDisconnectRef.current?.();
    },
    [apprenantId, clearTimers, connexionId],
  );

  const handleServerValidation = useCallback(
    async (event: "heartbeat" | "heartbeat_exam" | "action" | "confirm_presence" = "heartbeat") => {
      if (endingRef.current) return;

      const validation = await runServerCheck(event);
      if (!validation) return;

      if (!validation.is_valid) {
        const reason = validation.disconnect_reason || "max_duration";
        // Benign reasons caused by React double-mount or another tab opening:
        // do NOT sign the user out, just silently stop polling.
        if (reason === "replaced_by_new_session" || reason === "no_active_session" || reason === "already_closed") {
          console.warn(`[PresenceCheck] Session ignorée (raison bénigne): ${reason}`);
          clearTimers();
          setShowModal(false);
          modalDeadlineRef.current = null;
          setCountdownDeadline(null);
          return;
        }
        console.warn(`[PresenceCheck] Session serveur expirée sans déconnexion auth — raison: ${reason}`);
        clearTimers();
        setShowModal(false);
        modalDeadlineRef.current = null;
        setCountdownDeadline(null);
        return;
      }

      if (validation.should_show_presence_prompt) {
        if (Date.now() < suppressPromptUntilRef.current) {
          setShowModal(false);
          modalDeadlineRef.current = null;
          setCountdownDeadline(null);
          return;
        }

        const remaining = Math.max(0, validation.remaining_presence_seconds || 0);
        const deadline = Date.now() + remaining * 1000;
        setShowModal(true);
        modalDeadlineRef.current = deadline;
        setCountdownDeadline(deadline);

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
        setCountdownDeadline(null);
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
    suppressPromptUntilRef.current = Date.now() + PRESENCE_PROMPT_SNOOZE_MS;
    setShowModal(false);
    modalDeadlineRef.current = null;
    setCountdownDeadline(null);
    lastActionCheckAtRef.current = Date.now();
  }, [endSession, runServerCheck]);

  // Initial check + exam transition handling.
  // IMPORTANT: aucun setInterval ici — la détection de présence est désormais
  // 100% event-driven (focus / visibilitychange / clic / clavier) pour éviter
  // tout re-render global périodique pendant les quiz.
  useEffect(() => {
    if (!enabled || !apprenantId || !userId || !connexionId) {
      clearTimers();
      endingRef.current = false;
      promptLoggedRef.current = false;
      setShowModal(false);
      modalDeadlineRef.current = null;
      return;
    }

    const resumingFromExam = wasInExamRef.current && !isInExam;
    wasInExamRef.current = isInExam;

    if (isInExam) {
      clearTimers();
      setShowModal(false);
      modalDeadlineRef.current = null;
      setCountdownDeadline(null);
      return;
    }

    endingRef.current = false;

    if (resumingFromExam) {
      promptLoggedRef.current = false;
      setShowModal(false);
      modalDeadlineRef.current = null;
      setCountdownDeadline(null);
      void handleServerValidation("confirm_presence");
    } else {
      void handleServerValidation("heartbeat");
    }

    return () => {
      clearTimers();
    };
  }, [enabled, apprenantId, userId, connexionId, clearTimers, handleServerValidation, isInExam]);

  // Activity event listeners — only active when NOT in exam
  useEffect(() => {
    if (!enabled || !apprenantId || !userId || !connexionId || isInExam) return;

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
  }, [enabled, apprenantId, userId, connexionId, handleServerValidation, isInExam]);

  // Expiry timer: déclenche endSession à la deadline — pas de tick state ici.
  // Le countdown affiché est calculé localement dans le modal isolé (React.memo).
  useEffect(() => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    expiryTimerRef.current = null;

    if (!showModal || !modalDeadlineRef.current) return;

    const delay = Math.max(0, modalDeadlineRef.current - Date.now());
    expiryTimerRef.current = setTimeout(() => {
      expiryTimerRef.current = null;
      void endSession("no_response");
    }, delay);

    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    };
  }, [showModal, endSession, countdownDeadline]);

  return {
    showModal,
    countdownDeadline,
    disconnectReason,
    confirmPresence,
  };
}
