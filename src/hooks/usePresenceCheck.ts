import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const SEVEN_HOURS_MS = 7 * 60 * 60 * 1000;
const COUNTDOWN_TICK_MS = 1000;

/** Returns true if current time is between 22:00 and 05:00 */
function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 5;
}

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

  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxSessionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckTimeRef = useRef<number>(Date.now());

  const clearAllTimers = useCallback(() => {
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (maxSessionRef.current) clearTimeout(maxSessionRef.current);
    checkIntervalRef.current = null;
    countdownRef.current = null;
    maxSessionRef.current = null;
  }, []);

  const endSession = useCallback(async (reason: string) => {
    clearAllTimers();
    setShowModal(false);
    setDisconnectReason(reason);

    if (connexionId) {
      await supabase
        .from("apprenant_connexions" as any)
        .update({
          ended_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", connexionId);
    }

    // Small delay so user can see the disconnect message
    setTimeout(() => {
      onForceDisconnect();
    }, 3000);
  }, [connexionId, clearAllTimers, onForceDisconnect]);

  const startCountdown = useCallback(() => {
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

    const start = Date.now();
    countdownRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
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
    setCountdownSeconds(600);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
    lastCheckTimeRef.current = Date.now();
  }, []);

  // Main effect: set up 4h interval check + 7h absolute limit
  useEffect(() => {
    if (!enabled || !sessionStartTime) {
      clearAllTimers();
      return;
    }

    lastCheckTimeRef.current = Date.now();

    // 4-hour periodic check
    checkIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastCheckTimeRef.current;
      if (elapsed >= FOUR_HOURS_MS) {
        startCountdown();
      }
    }, 60_000); // Check every minute if 4h has passed

    // 7h absolute session limit
    const elapsed = Date.now() - sessionStartTime;
    const remaining = Math.max(0, SEVEN_HOURS_MS - elapsed);

    if (remaining <= 0) {
      endSession("max_duration");
      return;
    }

    maxSessionRef.current = setTimeout(() => {
      endSession("max_duration");
    }, remaining);

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
