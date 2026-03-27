import { useEffect, useRef, useCallback, useState } from "react";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const AUTO_DISCONNECT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

interface UseInactivityAlertParams {
  enabled: boolean;
  onDisconnect: () => void;
  /** When true, inactivity detection is completely paused (e.g. during an exam) */
  pauseDuringExam?: boolean;
}

export function useInactivityAlert({ enabled, onDisconnect, pauseDuringExam = false }: UseInactivityAlertParams) {
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [inactivityCountdown, setInactivityCountdown] = useState(300); // 5min in seconds

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectedRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    inactivityTimerRef.current = null;
    disconnectTimerRef.current = null;
    countdownIntervalRef.current = null;
  }, []);

  const startDisconnectCountdown = useCallback(() => {
    setShowInactivityModal(true);
    setInactivityCountdown(300);
    const deadline = Date.now() + AUTO_DISCONNECT_TIMEOUT;

    countdownIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setInactivityCountdown(remaining);
      if (remaining <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }, 1000);

    disconnectTimerRef.current = setTimeout(() => {
      if (!disconnectedRef.current) {
        disconnectedRef.current = true;
        clearAllTimers();
        setShowInactivityModal(false);
        onDisconnect();
      }
    }, AUTO_DISCONNECT_TIMEOUT);
  }, [clearAllTimers, onDisconnect]);

  const resetInactivityTimer = useCallback(() => {
    if (!enabled || disconnectedRef.current) return;

    // If modal is showing, don't reset — user must click the button
    if (showInactivityModal) return;

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    inactivityTimerRef.current = setTimeout(() => {
      startDisconnectCountdown();
    }, INACTIVITY_TIMEOUT);
  }, [enabled, showInactivityModal, startDisconnectCountdown]);

  const confirmActivity = useCallback(() => {
    clearAllTimers();
    setShowInactivityModal(false);
    setInactivityCountdown(300);
    // Restart the 30min inactivity timer
    if (enabled && !disconnectedRef.current) {
      inactivityTimerRef.current = setTimeout(() => {
        startDisconnectCountdown();
      }, INACTIVITY_TIMEOUT);
    }
  }, [clearAllTimers, enabled, startDisconnectCountdown]);

  useEffect(() => {
    if (!enabled || pauseDuringExam) {
      clearAllTimers();
      setShowInactivityModal(false);
      disconnectedRef.current = false;
      return;
    }

    disconnectedRef.current = false;

    const events: Array<keyof WindowEventMap> = [
      "mousemove", "mousedown", "click", "keydown", "touchstart", "scroll", "pointerdown",
    ];

    const handler = () => resetInactivityTimer();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetInactivityTimer(); // start initial timer

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      clearAllTimers();
    };
  }, [enabled, pauseDuringExam, resetInactivityTimer, clearAllTimers]);

  return {
    showInactivityModal,
    inactivityCountdown,
    confirmActivity,
  };
}
