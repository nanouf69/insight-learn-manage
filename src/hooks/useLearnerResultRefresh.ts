import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CORE_TABLES = ["core_exam_results", "qrc_instances_v2"];
const ALL_TABLES = [...CORE_TABLES, "apprenant_quiz_results", "apprenant_module_completion"];

/** Event-only catch-up, shared per learner/table set. No periodic polling. */
export function useLearnerResultRefresh(apprenantId: string | null | undefined, allTables = false) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!apprenantId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const bump = () => {
      if (!active || document.visibilityState === "hidden" || !navigator.onLine) return;
      if (timer) return;
      timer = setTimeout(() => { timer = undefined; if (active) setTick(t => t + 1); }, 400);
    };
    const resume = () => {
      bump();
      // One additional read per resume, not a recurring timer: catches delayed reconnect.
      if (retry) clearTimeout(retry);
      retry = setTimeout(bump, 2000);
    };
    let channel = supabase.channel(`result-refresh-${apprenantId}-${Math.random().toString(36).slice(2)}`);
    for (const table of allTables ? ALL_TABLES : CORE_TABLES) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `apprenant_id=eq.${apprenantId}` }, bump);
    }
    channel.subscribe(status => { if (status === "SUBSCRIBED") resume(); });
    window.addEventListener("online", resume);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      if (retry) clearTimeout(retry);
      window.removeEventListener("online", resume);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
      void supabase.removeChannel(channel);
    };
  }, [apprenantId, allTables]);
  return tick;
}