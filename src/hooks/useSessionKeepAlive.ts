import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Keeps the auth session warm by reading it every 5 minutes.
  * Tablets often stay open while learners read/watch without touching the screen,
 * so this must not depend on recent pointer activity. We deliberately avoid
 * manual refreshSession calls because multiple tablet tabs can race and revoke
 * each other's refresh token.
 */
export function useSessionKeepAlive(enabled: boolean, forceAlways = false) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const touchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.refresh_token) return;
        console.log(`[KeepAlive] Session checked${forceAlways ? " (exam mode)" : ""}`);
      } catch (err) {
        console.warn("[KeepAlive] Session check error:", err);
      }
    };

    void touchSession();
    intervalRef.current = setInterval(touchSession, REFRESH_INTERVAL_MS);

    const refreshOnResume = () => {
      void touchSession();
    };

    window.addEventListener("focus", refreshOnResume);
    window.addEventListener("online", refreshOnResume);
    document.addEventListener("visibilitychange", refreshOnResume);

    return () => {
      window.removeEventListener("focus", refreshOnResume);
      window.removeEventListener("online", refreshOnResume);
      document.removeEventListener("visibilitychange", refreshOnResume);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, forceAlways]);
}
