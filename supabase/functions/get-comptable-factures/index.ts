import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the fournisseur token AND that it's a comptable
    const { data: fournisseur, error: fErr } = await supabase
      .from("fournisseurs")
      .select("id, nom, comptable_only")
      .eq("token", token)
      .eq("comptable_only", true)
      .maybeSingle();

    if (fErr || !fournisseur) {
      return new Response(JSON.stringify({ error: "Accès non autorisé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch factures de ventes (client invoices)
    const { data: ventesData } = await supabase
      .from("factures")
      .select("id, numero, client_nom, montant_ttc, montant_ht, montant_tva, tva_taux, statut, date_emission, date_echeance, date_paiement, type_financement, client_opco")
      .order("date_emission", { ascending: false });

    // Fetch factures d'achats (supplier invoices) with fournisseur name
    const { data: achatsData } = await supabase
      .from("fournisseur_factures")
      .select("id, nom_fichier, url, destinataire, montant, description, statut, mois_annee, moyen_paiement, date_paiement, created_at, fournisseurs(nom)")
      .order("created_at", { ascending: false });

    return new Response(
      JSON.stringify({
        ventes: ventesData || [],
        achats: achatsData || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
