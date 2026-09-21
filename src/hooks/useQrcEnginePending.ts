import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchLearnerQrcPending } from "@/lib/qrcInstances";

/**
 * Blocage de note côté apprenant pour les examens branchés sur le nouveau
 * moteur QRC. Renvoie `null` pour tout examen non branché : l'écran conserve
 * alors strictement son comportement actuel.
 */
export function useQrcEnginePending(apprenantId: string | null | undefined, quizIds: string[]) {
  const [state, setState] = useState<Record<string, { pendingByMatiere: Set<string>; pendingTotal: number }>>({});
  const key = quizIds.filter(Boolean).sort().join("|");

  useEffect(() => {
    let cancelled = false;
    const ids = key ? key.split("|") : [];
    if (!apprenantId || ids.length === 0) { setState({}); return; }

    const load = async () => {
      const next: Record<string, { pendingByMatiere: Set<string>; pendingTotal: number }> = {};
      for (const quizId of ids) {
        const res = await fetchLearnerQrcPending({ apprenantId, quizId });
        if (res) next[quizId] = res;
      }
      if (!cancelled) setState(next);
    };
    load();

    const channel = supabase
      .channel(`qrc-instances-learner-${apprenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "qrc_instances", filter: `apprenant_id=eq.${apprenantId}` }, () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [apprenantId, key]);

  return {
    /** null = examen non branché (comportement historique conservé). */
    isExamPending(quizId: string): boolean | null {
      const entry = state[quizId];
      if (!entry) return null;
      return entry.pendingTotal > 0;
    },
    isMatierePending(quizId: string, matiereId: string): boolean | null {
      const entry = state[quizId];
      if (!entry) return null;
      return entry.pendingByMatiere.has(matiereId);
    },
  };
}
