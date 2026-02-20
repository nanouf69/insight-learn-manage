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

    // Factures de ventes : d'abord depuis la table factures (formelles)
    const { data: facturesFormelles } = await supabase
      .from("factures")
      .select("id, numero, client_nom, montant_ttc, montant_ht, montant_tva, tva_taux, statut, date_emission, date_echeance, date_paiement, type_financement, client_opco")
      .order("date_emission", { ascending: false });

    // Factures de ventes : depuis apprenants si table factures vide
    const { data: apprenants } = await supabase
      .from("apprenants")
      .select("id, nom, prenom, formation_choisie, montant_ttc, montant_paye, mode_financement, organisme_financeur, date_debut_formation, date_fin_formation, statut, created_at")
      .gt("montant_ttc", 0)
      .order("created_at", { ascending: false });

    // Construire la liste des ventes
    let ventes: any[] = [];
    if (facturesFormelles && facturesFormelles.length > 0) {
      ventes = facturesFormelles;
    } else if (apprenants) {
      // Utiliser les apprenants comme source de facturation
      ventes = apprenants.map((a) => ({
        id: a.id,
        numero: `APP-${a.id.substring(0, 8).toUpperCase()}`,
        client_nom: `${a.prenom} ${a.nom}`,
        montant_ttc: a.montant_ttc,
        montant_paye: a.montant_paye || 0,
        montant_restant: (a.montant_ttc || 0) - (a.montant_paye || 0),
        statut: (a.montant_paye || 0) >= (a.montant_ttc || 0) ? "payee" : "en_attente",
        date_emission: a.created_at,
        type_financement: a.mode_financement || "personnel",
        formation: a.formation_choisie,
        organisme_financeur: a.organisme_financeur,
      }));
    }

    // Toutes les factures fournisseurs (achats) avec nom du fournisseur
    const { data: achatsData } = await supabase
      .from("fournisseur_factures")
      .select("id, nom_fichier, url, destinataire, montant, description, statut, mois_annee, moyen_paiement, date_paiement, created_at, fournisseur_id, fournisseurs(nom)")
      .order("created_at", { ascending: false });

    return new Response(
      JSON.stringify({
        ventes,
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
