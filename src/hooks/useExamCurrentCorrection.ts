import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getModuleIdForExamId } from "@/components/cours-en-ligne/ExamensBlancsEditor";
import { ecouterContenuModifie } from "@/lib/contenuModifie";
import { parseCurrentCorrection, type ExamCurrentCorrection } from "@/lib/examCurrentCorrection";

/** Event-only, read-only; mounted only in submitted-copy correction screens. */
export function useExamCurrentCorrection(examId: string, owner: string | null | undefined, enabled: boolean) {
  const key = JSON.stringify([examId, owner, enabled]);
  const [state, setState] = useState<{key: string; source: ExamCurrentCorrection | null; error: boolean}>({key: "", source: null, error: false});
  useEffect(() => {
    if (!enabled || !owner || examId.toLowerCase().startsWith("bilan-")) return;
    let alive = true, inFlight = false, dirty = false, generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const moduleId = getModuleIdForExamId(examId);
    const load = async () => {
      if (!alive || inFlight) return;
      inFlight = true; dirty = false;
      const g = generation;
      setState({key, source: null, error: false});
      try {
        const {data, error} = await supabase.from("module_editor_state").select("module_data,updated_at").eq("module_id", moduleId).maybeSingle();
        if (error) throw error;
        const source = parseCurrentCorrection(data, examId);
        if (alive && g === generation) setState({key, source, error: false});
      } catch {
        if (alive && g === generation) setState({key, source: null, error: true});
      } finally {
        inFlight = false;
        if (alive && dirty) void load();
      }
    };
    const refresh = () => {
      generation++; dirty = true;
      setState({key, source: null, error: false});
      if (document.visibilityState === "hidden" || !navigator.onLine) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = undefined; void load(); }, 250);
    };
    void load();
    const stopLocal = ecouterContenuModifie(refresh);
    const channel = supabase.channel(`exam-current-${moduleId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", {event: "*", schema: "public", table: "module_editor_state", filter: `module_id=eq.${moduleId}`}, refresh)
      .subscribe(status => { if (status === "SUBSCRIBED") refresh(); });
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false; generation++; if (timer) clearTimeout(timer);
      stopLocal(); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh); void supabase.removeChannel(channel);
    };
  }, [key, examId, owner, enabled]);
  return state.key === key && enabled ? state : {key, source: null, error: false};
}