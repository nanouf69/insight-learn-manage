import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_SLOTS = [
  "11:00","11:15","11:30","11:45",
  "12:00","12:15","12:30","12:45",
  "13:00","13:15","13:30","13:45",
];

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
    const body = await req.json();
    const apprenant_id: string = body.apprenant_id;
    const slot: string = body.slot;
    const telephone: string = (body.telephone || "").toString().trim();

    if (!/^[0-9a-f-]{36}$/i.test(apprenant_id)) {
      return new Response(JSON.stringify({ error: "invalid_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!VALID_SLOTS.includes(slot)) {
      return new Response(JSON.stringify({ error: "invalid_slot" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (telephone.length < 6) {
      return new Response(JSON.stringify({ error: "invalid_phone" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: app } = await supabase
      .from("apprenants")
      .select("id, nom, prenom, date_examen_theorique")
      .eq("id", apprenant_id)
      .maybeSingle();

    if (!app || !hasExam26Mai(app.date_examen_theorique)) {
      return new Response(JSON.stringify({ error: "not_eligible" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: existing } = await supabase
      .from("creneaux_rdv")
      .select("slot")
      .eq("apprenant_id", apprenant_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "already_booked", slot: existing.slot }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const nom = `${app.prenom ?? ""} ${app.nom ?? ""}`.trim();
    const { error: insErr } = await supabase
      .from("creneaux_rdv")
      .insert({ slot, apprenant_id, nom, telephone });

    if (insErr) {
      // Unique violation
      if ((insErr as any).code === "23505") {
        return new Response(JSON.stringify({ error: "slot_taken" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, slot }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
