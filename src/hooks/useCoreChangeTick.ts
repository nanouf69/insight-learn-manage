import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Compteur incrémenté à chaque correction / révision / publication serveur
 * d'un passage du nouveau système pour cet apprenant (temps réel, sans
 * rafraîchissement périodique). Les écrans l'ajoutent à leurs dépendances
 * pour relire immédiatement le même état serveur.
 */
export function useCoreChangeTick(apprenantId: string | null | undefined): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!apprenantId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setTick((t) => t + 1), 400);
    };
    const channel = supabase
      .channel(`core-publication-${apprenantId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "core_exam_results", filter: `apprenant_id=eq.${apprenantId}` }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "qrc_instances_v2", filter: `apprenant_id=eq.${apprenantId}` }, bump)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [apprenantId]);
  return tick;
}
