import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const SEVEN_HOURS_MS = 7 * 60 * 60 * 1000;
const COUNTDOWN_TICK_MS = 1000;
const POLL_INTERVAL_MS = 30_000; // Check every 30 seconds for reliability

interface UsePresenceCheckParams {
  apprenantId: string | null;
  userId: string | null;
  connexionId: string | null;
  sessionStartTime: number | null; // Date.now() when session started
  enabled: boolean;
  onForceDisconnect: () => void;
}

export function usePresenceCheck({
  apprenantId,
  userId,
  connexionId,
  sessionStartTime,
  enabled,
  onForceDisconnect,
}: UsePresenceCheckParams) {
  const [showModal, setShowModal] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(600); // 10 min
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastConfirmTimeRef = useRef<number>(Date.now());
  const modalShownRef = useRef(false);
  const modalStartRef = useRef<number | null>(null);
  const endingRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    pollRef.current = null;
    countdownRef.current = null;
  }, []);

  const endSession = useCallback(async (reason: string) => {
    if (endingRef.current) return;
    endingRef.current = true;
    clearAllTimers();
    setShowModal(false);
    modalShownRef.current = false;
    setDisconnectReason(reason);

    if (connexionId) {
      // Cap ended_at to sessionStart + 7h
      let endedAt = new Date();
      if (sessionStartTime) {
        const maxEnd = new Date(sessionStartTime + SEVEN_HOURS_MS);
        if (endedAt > maxEnd) endedAt = maxEnd;
      }
      await supabase
        .from("apprenant_connexions" as any)
        .update({
          ended_at: endedAt.toISOString(),
          last_seen_at: endedAt.toISOString(),
        })
        .eq("id", connexionId);
    }

    // Small delay so user can see the disconnect message
    setTimeout(() => {
      onForceDisconnect();
    }, 3000);
  }, [connexionId, sessionStartTime, clearAllTimers, onForceDisconnect]);

  const startCountdown = useCallback(() => {
    if (modalShownRef.current) return; // Already showing
    modalShownRef.current = true;
    modalStartRef.current = Date.now();
    setShowModal(true);
    setCountdownSeconds(600);

    // Send encouraging toast message at 4h mark
    toast.info("💪 Bravo ! Vous êtes connecté(e) depuis 4 heures. N'oubliez pas de faire une pause si besoin. Votre régularité est la clé de votre réussite !", {
      duration: 10000,
      position: "top-center",
    });

    // Log the 4h encouragement to the database
    if (apprenantId && userId && connexionId) {
      supabase
        .from("apprenant_module_activites" as any)
        .insert({
          apprenant_id: apprenantId,
          user_id: userId,
          connexion_id: connexionId,
          module_id: 0,
          module_nom: "Système",
          action_type: "encouragement_4h",
          metadata: { message: "Message d'encouragement à 4h de connexion" },
        })
        .then(() => {
          console.log("Encouragement 4h enregistré");
        });
    }

    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      if (!modalStartRef.current) return;
      const elapsed = Date.now() - modalStartRef.current;
      const remaining = Math.max(0, Math.ceil((TEN_MINUTES_MS - elapsed) / 1000));
      setCountdownSeconds(remaining);

      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        endSession("no_response");
      }
    }, COUNTDOWN_TICK_MS);
  }, [endSession, apprenantId, userId, connexionId]);

  const confirmPresence = useCallback(() => {
    setShowModal(false);
    modalShownRef.current = false;
    modalStartRef.current = null;
    setCountdownSeconds(600);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
    lastConfirmTimeRef.current = Date.now();
  }, []);

  // Main polling effect: check elapsed time every 30s
  // This is resilient to browser throttling and device sleep
  useEffect(() => {
    if (!enabled || !sessionStartTime) {
      clearAllTimers();
      endingRef.current = false;
      return;
    }

    endingRef.current = false;
    lastConfirmTimeRef.current = Date.now();

    const checkTimeLimits = () => {
      if (endingRef.current) return;

      const now = Date.now();
      const totalElapsed = now - sessionStartTime;

      // HARD LIMIT: 7 hours absolute maximum — no exceptions
      if (totalElapsed >= SEVEN_HOURS_MS) {
        console.log(`Session limit reached: ${Math.round(totalElapsed / 60000)}min elapsed, forcing disconnect`);
        endSession("max_duration");
        return;
      }

      // 4-hour presence check: if modal not showing and 4h since last confirm
      if (!modalShownRef.current) {
        const sinceLast = now - lastConfirmTimeRef.current;
        if (sinceLast >= FOUR_HOURS_MS) {
          startCountdown();
        }
      }

      // If modal is showing, check the 10min countdown using real elapsed time
      if (modalShownRef.current && modalStartRef.current) {
        const modalElapsed = now - modalStartRef.current;
        if (modalElapsed >= TEN_MINUTES_MS) {
          endSession("no_response");
        }
      }
    };

    // Run immediately on mount
    checkTimeLimits();

    // Poll every 30 seconds — works even after browser wakes from sleep
    pollRef.current = setInterval(checkTimeLimits, POLL_INTERVAL_MS);

    return () => {
      clearAllTimers();
    };
  }, [enabled, sessionStartTime, clearAllTimers, startCountdown, endSession]);

  return {
    showModal,
    countdownSeconds,
    disconnectReason,
    confirmPresence,
  };
}
