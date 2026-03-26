import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_WINDOW_MS = 15 * 60 * 1000;  // consider active if interaction < 15 min ago

/**
 * Keeps the Supabase auth session alive by refreshing the token every 10 minutes
 * while the user is active (mouse, keyboard, touch, scroll).
 * Prevents token expiry during long exam/module sessions.
 */
export function useSessionKeepAlive(enabled: boolean) {
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ["mousemove", "keydown", "touchstart", "scroll", "click"];
    events.forEach(e => window.addEventListener(e, markActive, { passive: true }));

    intervalRef.current = setInterval(async () => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle > ACTIVITY_WINDOW_MS) {
        console.log("[KeepAlive] User idle, skipping token refresh");
        return;
      }
      try {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn("[KeepAlive] Token refresh failed:", error.message);
        } else {
          console.log("[KeepAlive] Token refreshed successfully");
        }
      } catch (err) {
        console.warn("[KeepAlive] Token refresh error:", err);
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      events.forEach(e => window.removeEventListener(e, markActive));
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);
}
