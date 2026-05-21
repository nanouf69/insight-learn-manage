import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function hasExam26Mai(date: string | null | undefined): boolean {
  if (!date) return false;
  const d = date.toLowerCase();
  return (
    d.includes("26 mai") ||
    d.includes("2025-05-26") ||
    d.includes("2026-05-26") ||
    d.includes("26/05/2025") ||
    d.includes("26/05/2026")
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return new Response(JSON.stringify({ error: "invalid_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: app, error } = await supabase
      .from("apprenants")
      .select("id, nom, prenom, telephone, date_examen_theorique")
      .eq("id", id)
      .maybeSingle();

    if (error || !app) {
      return new Response(JSON.stringify({ eligible: false, reason: "not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!hasExam26Mai(app.date_examen_theorique)) {
      return new Response(
        JSON.stringify({ eligible: false, reason: "not_concerned" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existing } = await supabase
      .from("creneaux_rdv")
      .select("slot, telephone, created_at")
      .eq("apprenant_id", id)
      .maybeSingle();

    const { data: slots } = await supabase
      .from("creneaux_rdv")
      .select("slot");

    return new Response(
      JSON.stringify({
        eligible: true,
        apprenant: {
          id: app.id,
          nom: app.nom,
          prenom: app.prenom,
          telephone: app.telephone ?? "",
        },
        existing: existing ?? null,
        takenSlots: (slots ?? []).map((s: any) => s.slot),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
