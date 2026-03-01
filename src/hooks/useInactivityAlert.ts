import { useEffect, useRef, useCallback } from "react";

const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in ms

interface UseInactivityAlertParams {
  enabled: boolean;
  onInactive: () => void;
}

export function useInactivityAlert({ enabled, onInactive }: UseInactivityAlertParams) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    firedRef.current = false;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        onInactive();
      }
    }, INACTIVITY_TIMEOUT);
  }, [enabled, onInactive]);

  useEffect(() => {
    if (!enabled) return;

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

    const handler = () => resetTimer();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimer(); // start initial timer

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, resetTimer]);
}
