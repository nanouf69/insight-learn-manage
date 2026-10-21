import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Lecture seule : dernier état EDOF par apprenant (le plus récent fait foi). */
export function useEdofValides() {
  return useQuery({
    queryKey: ["edof-fin-formation-tous"],
    staleTime: 60_000,
    queryFn: async () => {
      const dernier = new Map<string, boolean>();
      const pas = 1000;
      for (let from = 0; ; from += pas) {
        const { data, error } = await (supabase as any)
          .from("edof_fin_formation")
          .select("apprenant_id,mis_fin_formation,created_at")
          .order("created_at", { ascending: false })
          .range(from, from + pas - 1);
        if (error) throw error;
        for (const r of data ?? []) {
          if (!dernier.has(r.apprenant_id)) dernier.set(r.apprenant_id, r.mis_fin_formation === true);
        }
        if (!data || data.length < pas) break;
      }
      return new Set([...dernier].filter(([, v]) => v).map(([k]) => k));
    },
  });
}

export function EdofValideBadge({ apprenantId }: { apprenantId: string }) {
  const { data } = useEdofValides();
  if (!data?.has(apprenantId)) return null;
  return (
    <span
      className="shrink-0 rounded bg-primary px-1 text-[9px] font-bold leading-4 text-primary-foreground"
      title="Validé sur EDOF"
    >
      E
    </span>
  );
}
