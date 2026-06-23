import { useEffect, useRef, useCallback, useState } from "react";

const INACTIVITY_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours
const PRESENCE_RESPONSE_WINDOW = 30 * 60 * 1000; // 30 minutes

interface UseInactivityAlertParams {
  enabled: boolean;
  onDisconnect: () => void;
  /** When true, inactivity detection is completely paused (e.g. during an exam) */
  pauseDuringExam?: boolean;
}

export function useInactivityAlert({ enabled, onDisconnect, pauseDuringExam = false }: UseInactivityAlertParams) {
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  // Deadline timestamp (ms). Setting once when modal opens — NO per-second
  // state updates: le modal isolé calcule lui-même le compte à rebours
  // localement pour éviter de re-render le parent (et casser le scroll).
  const [inactivityDeadline, setInactivityDeadline] = useState<number | null>(null);

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnectedRef = useRef(false);

  const onDisconnectRef = useRef(onDisconnect);
  useEffect(() => {
    onDisconnectRef.current = onDisconnect;
  }, [onDisconnect]);

  const clearAllTimers = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
    inactivityTimerRef.current = null;
    disconnectTimerRef.current = null;
  }, []);

  const startDisconnectCountdown = useCallback(() => {
    const deadline = Date.now() + PRESENCE_RESPONSE_WINDOW;
    setShowInactivityModal(true);
    setInactivityDeadline(deadline);

    disconnectTimerRef.current = setTimeout(() => {
      if (!disconnectedRef.current) {
        clearAllTimers();
        setShowInactivityModal(false);
        setInactivityDeadline(null);
        resetInactivityTimer();
      }
    }, PRESENCE_RESPONSE_WINDOW);
  }, [clearAllTimers, resetInactivityTimer]);

  const resetInactivityTimer = useCallback(() => {
    if (!enabled || disconnectedRef.current) return;
    if (showInactivityModal) return;

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    inactivityTimerRef.current = setTimeout(() => {
      startDisconnectCountdown();
    }, INACTIVITY_TIMEOUT);
  }, [enabled, showInactivityModal, startDisconnectCountdown]);

  const confirmActivity = useCallback(() => {
    clearAllTimers();
    setShowInactivityModal(false);
    setInactivityDeadline(null);
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
      setInactivityDeadline(null);
      disconnectedRef.current = false;
      return;
    }

    disconnectedRef.current = false;

    const events: Array<keyof WindowEventMap> = [
      "mousemove", "mousedown", "click", "keydown", "touchstart", "scroll", "pointerdown",
    ];

    const handler = () => resetInactivityTimer();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetInactivityTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      clearAllTimers();
    };
  }, [enabled, pauseDuringExam, resetInactivityTimer, clearAllTimers]);

  return {
    showInactivityModal,
    inactivityDeadline,
    confirmActivity,
  };
}
