import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, query } = await req.json();
    if (!token || !query || query.trim().length < 2) {
      return new Response(JSON.stringify({ data: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify token belongs to an active formateur fournisseur
    const { data: fournisseur } = await supabaseAdmin
      .from("fournisseurs")
      .select("id, formateur_id, actif")
      .eq("token", token)
      .single();

    if (!fournisseur || !fournisseur.actif || !fournisseur.formateur_id) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const q = query.trim();
    const { data: apprenants } = await supabaseAdmin
      .from("apprenants")
      .select("id, nom, prenom, type_apprenant, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne, modules_autorises")
      .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%`)
      .order("nom")
      .limit(10);

    return new Response(JSON.stringify({ data: apprenants || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
