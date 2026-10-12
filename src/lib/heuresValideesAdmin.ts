import { supabase } from "@/integrations/supabase/client";

/** Heures de présence validées par l'administration (append-only), lecture seule. */
export async function fetchHeuresValideesAdmin(apprenantId: string) {
  const { data, error } = await supabase
    .from("presentiel_heures_validees" as any)
    .select("heures, date_presence, created_at")
    .eq("apprenant_id", apprenantId);
  if (error) throw error;
  const rows = (data as any[]) ?? [];
  const minutes = Math.round(rows.reduce((s, r) => s + (Number(r?.heures) || 0), 0) * 60);
  const journees = rows
    .map((r) => String(r?.date_presence || r?.created_at || "").slice(0, 10))
    .filter(Boolean)
    .map((date) => ({ date, label: "presence validee par l'administration" }));
  return { minutes, journees };
}
