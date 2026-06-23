import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
  * Keeps the auth session alive by refreshing the token every 5 minutes.
  * Tablets often stay open while learners read/watch without touching the screen,
  * so refresh must not depend on recent pointer activity.
 */
export function useSessionKeepAlive(enabled: boolean, forceAlways = false) {
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const refreshSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.refresh_token) return;

        const { error } = await supabase.auth.refreshSession(session);
        if (error) {
          console.warn("[KeepAlive] Token refresh failed:", error.message);
        } else {
          console.log(`[KeepAlive] Token refreshed successfully${forceAlways ? " (exam mode)" : ""}`);
        }
      } catch (err) {
        console.warn("[KeepAlive] Token refresh error:", err);
      }
    };

    void refreshSession();
    intervalRef.current = setInterval(refreshSession, REFRESH_INTERVAL_MS);

    const refreshOnResume = () => {
      lastActivityRef.current = Date.now();
      void refreshSession();
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
