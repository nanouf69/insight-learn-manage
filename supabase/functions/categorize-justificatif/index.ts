import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = [
  "abonnements_logiciels_cotisations", "abonnements_logiciels_plateformes", "abonnements_telephone",
  "achat_accessoires_fournitures", "achat_emballages", "achat_prestations_services",
  "assurances", "cadeau_client", "carburant", "catalogues_imprimes", "commissions_versees",
  "congres_expositions", "credit_bail", "depenses_sous_traitance", "depenses_sous_traitance_prestation",
  "documentation", "dons_pourboires", "eau", "electricite", "entretien_vehicule",
  "fournitures_administratives", "frais_enregistrement_greffe", "frais_deplacement_tva",
  "frais_deplacement_sans_tva", "frais_internet", "frais_kilometriques", "frais_postaux_tva",
  "gaz", "honoraires_payes", "interimaires", "location_materiel", "loyers_charges_locatives",
  "marketing", "mission", "nettoyage_entretien_reparations", "note_de_frais",
  "peages_parking", "petits_materiels", "publicite", "remunerations_transitaires",
  "restaurants", "salon_seminaires_conferences", "compte_attente",
  "depenses_exploitation_exceptionnelles", "facturation_frais_port", "gains_exceptionnels",
  "indemnites_assurances", "revenus_activites_annexes", "subvention_exploitation",
  "caution_recue", "emprunt", "frais_bancaires_tva", "interets_bancaires",
  "interets_retard_gains", "interets_emprunts", "placements_financiers", "produits_financiers",
  "transfert_intragroupe", "virement_banque_banque", "virement_interne",
  "capital", "dividendes_associes", "subventions_investissement",
  "logiciel", "materiel_outillage", "materiel_informatique", "mobilier", "vehicule",
  "amendes", "autres_taxes", "cfe", "impot_societes", "impots_divers", "tva_payee",
  "cotisations_recues", "formation_professionnelle", "vente_prestations_normal",
  "charges_sociales_salaries", "cotisations_sociales_dirigeant", "remuneration_dirigeant",
  "salaires_nets", "tickets_restaurants", "mutuelle", "autre"
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { nom_fichier, description, fournisseur, montant } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY manquant");

    const prompt = `Tu es un expert-comptable français. Analyse ce justificatif et retourne UNIQUEMENT la catégorie comptable la plus appropriée parmi la liste fournie. Ne retourne rien d'autre que la valeur exacte de la catégorie.

Informations du justificatif :
- Nom du fichier : ${nom_fichier || "inconnu"}
- Fournisseur : ${fournisseur || "inconnu"}  
- Description : ${description || "aucune"}
- Montant TTC : ${montant ? montant + "€" : "inconnu"}

Liste des catégories disponibles (retourne exactement l'une de ces valeurs) :
${CATEGORIES.join(", ")}

Règles :
- TOTAL, BP, AVIA → carburant
- EDF, ENEDIS → electricite
- ORANGE, SFR, BOUYGUES, FREE → abonnements_telephone
- URSSAF → cotisations_sociales_dirigeant
- Virement salaire → salaires_nets
- LOYER, BAIL → loyers_charges_locatives
- Assurance → assurances
- Restaurant, café → restaurants
- Amazon, Fnac (petit matériel) → achat_accessoires_fournitures
- Matériel informatique → materiel_informatique
- MAIF, AXA → assurances
- Si incertain → compte_attente

Réponds uniquement avec la valeur exacte de la catégorie, rien d'autre.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes IA atteinte, réessayez plus tard." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Erreur IA: ${response.status}`);
    }

    const data = await response.json();
    const rawCategorie = data.choices?.[0]?.message?.content?.trim().toLowerCase().replace(/\s/g, "_") || "compte_attente";
    
    // Validate that the returned category is in our list
    const categorie = CATEGORIES.includes(rawCategorie) ? rawCategorie : "compte_attente";

    return new Response(JSON.stringify({ categorie }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("categorize-justificatif error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue", categorie: "compte_attente" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
