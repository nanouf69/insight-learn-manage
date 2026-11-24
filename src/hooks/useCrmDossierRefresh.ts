import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Refresh recorded evidence only: never remount editors or mutate a dossier. */
export function useCrmDossierRefresh(apprenantId: string) {
  const client = useQueryClient();

  useEffect(() => {
    if (!apprenantId) return;
    let disposed = false;
    let invalidating = false;
    let subscribed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let listsDirty = false;

    const refresh = (includeLists = false) => {
      if (disposed || invalidating) return;
      listsDirty ||= includeLists;
      // One read batch per burst, without a recurring timer.
      if (timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (disposed) return;
        invalidating = true;
        void client.invalidateQueries({
          predicate: (query) => query.queryKey.includes(apprenantId),
        });
        if (listsDirty) {
          for (const key of ["apprenants-crm", "apprenants", "apprenants-examen"]) {
            void client.invalidateQueries({ queryKey: [key] });
          }
        }
        listsDirty = false;
        invalidating = false;
      }, 300);
    };

    // Existing save handlers invalidate their own panel: catch that signal and
    // refresh the other indicators of the same learner, not unrelated dossiers.
    const stopQueries = client.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "invalidate"
        && event.query.queryKey.includes(apprenantId)) {
        refresh(true);
      }
    });
    const stopMutations = client.getMutationCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "success") return;
      const variables = event.mutation.state.variables;
      if (typeof variables !== "object" || variables === null) return;
      const owner = variables as Record<string, unknown>;
      if ([owner.apprenantId, owner.apprenant_id, owner.id].includes(apprenantId)) {
        refresh(true);
      }
    });

    // These small tables are already enabled in the live publication. Other
    // sources rely on confirmed local saves/resume, NOT silent schema changes.
    const channel = supabase.channel(`crm-dossier-${apprenantId}-${crypto.randomUUID()}`);
    for (const table of ["reservations_pratique", "presentiel_presence_creneaux", "presentiel_validation_decisions"]) {
      for (const event of ["INSERT", "UPDATE"] as const) {
        channel.on("postgres_changes", {
          event, schema: "public", table, filter: `apprenant_id=eq.${apprenantId}`,
        }, () => refresh(true));
      }
    }
    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      const detail = client.getQueryState(["apprenant-detail", apprenantId]);
      if (subscribed || (detail?.fetchStatus !== "fetching"
        && Date.now() - (detail?.dataUpdatedAt ?? 0) > 10_000)) refresh();
      subscribed = true;
    });

    const resume = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);

    return () => {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
      stopQueries();
      stopMutations();
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
      void supabase.removeChannel(channel);
    };
  }, [apprenantId, client]);
}