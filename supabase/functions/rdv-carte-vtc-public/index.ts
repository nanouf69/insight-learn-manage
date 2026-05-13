import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    if (req.method === "GET" || action === "list") {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("rdv_carte_vtc_slots")
        .select("id, date, heure")
        .eq("statut", "libre")
        .gte("date", today)
        .order("date", { ascending: true })
        .order("heure", { ascending: true })
        .limit(500);
      if (error) throw error;
      return new Response(JSON.stringify({ slots: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { slotId, nom, prenom, email, telephone, notes } = await req.json();
      if (!slotId || !nom || !prenom || !telephone) {
        return new Response(JSON.stringify({ error: "Champs requis manquants" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // atomic-ish: only update if still libre
      const { data: updated, error } = await supabase
        .from("rdv_carte_vtc_slots")
        .update({ statut: "reserve", nom, prenom, email: email || null, telephone, notes: notes || null })
        .eq("id", slotId)
        .eq("statut", "libre")
        .select("id, date, heure")
        .maybeSingle();
      if (error) throw error;
      if (!updated) {
        return new Response(JSON.stringify({ error: "Ce créneau n'est plus disponible" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Notify admin (fire and forget)
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-admin`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY") || "" },
          body: JSON.stringify({
            type_document: "RDV Carte VTC réservé",
            nom, prenom, email, telephone,
            donnees: { date: updated.date, heure: updated.heure, notes },
          }),
        });
      } catch (_) {}

      return new Response(JSON.stringify({ ok: true, slot: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (err) {
    console.error("[rdv-carte-vtc-public]", err);
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
