import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_CATEGORIES = [
  "carburant", "electricite", "gaz", "eau", "abonnements_telephone", "frais_internet",
  "loyers_charges_locatives", "assurances", "restaurants", "peages_parking",
  "materiel_informatique", "abonnements_logiciels_cotisations", "frais_deplacement_tva",
  "frais_kilometriques", "fournitures_administratives", "achat_accessoires_fournitures",
  "honoraires_payes", "depenses_sous_traitance", "salaires_nets", "charges_sociales_salaries",
  "cotisations_sociales_dirigeant", "remuneration_dirigeant", "mutuelle", "tickets_restaurants",
  "frais_bancaires_tva", "interets_emprunts", "emprunt", "tva_payee", "impot_societes",
  "cfe", "formation_professionnelle", "marketing", "publicite", "vehicule",
  "logiciel", "mobilier", "nettoyage_entretien_reparations", "entretien_vehicule",
  "virement_interne", "virement_banque_banque", "note_de_frais", "mission",
  "salon_seminaires_conferences", "documentation", "autre", "compte_attente"
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { nom_fichier, description, fournisseur, montant } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY manquant");

    const prompt = `You are a French accountant. Categorize this expense receipt and return ONLY the exact category value from the list below. No explanation, no punctuation, just the category value.

Receipt info:
- File: ${nom_fichier || "unknown"}
- Vendor: ${fournisseur || "unknown"}
- Description: ${description || "none"}
- Amount: ${montant ? montant + "EUR" : "unknown"}

Rules:
- TOTAL/BP/AVIA/Shell = carburant
- EDF/ENEDIS = electricite
- ORANGE/SFR/BOUYGUES/FREE = abonnements_telephone
- URSSAF = cotisations_sociales_dirigeant
- Loyer/bail = loyers_charges_locatives
- MAIF/AXA/Allianz = assurances
- Restaurant/brasserie/café = restaurants
- Amazon/Fnac/Darty hardware = materiel_informatique
- Software/SaaS/app = abonnements_logiciels_cotisations
- Salary/salaire = salaires_nets
- Bank fees = frais_bancaires_tva
- Péage/autoroute = peages_parking
- If unsure = compte_attente

Categories: ${VALID_CATEGORIES.join(", ")}

Return only the category value:`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("AI gateway error:", response.status, errBody);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes IA atteinte.", categorie: "compte_attente" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants.", categorie: "compte_attente" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Erreur IA: ${response.status} - ${errBody}`);
    }

    const data = await response.json();
    console.log("Full AI response:", JSON.stringify(data));
    const rawContent = data.choices?.[0]?.message?.content?.trim() || "";
    console.log("AI raw response:", JSON.stringify(rawContent));

    // Normalize and match
    const normalized = rawContent.toLowerCase().replace(/[\s\-\.]/g, "_").replace(/[^a-z0-9_]/g, "");
    
    // Exact match first
    let categorie = VALID_CATEGORIES.find(c => c === normalized) || null;
    
    // Partial match: look for category inside response
    if (!categorie) {
      categorie = VALID_CATEGORIES.find(c => normalized.includes(c)) || null;
    }
    // Reverse: look for response inside a category
    if (!categorie && normalized.length > 3) {
      categorie = VALID_CATEGORIES.find(c => c.includes(normalized)) || null;
    }

    const finalCategorie = categorie || "compte_attente";
    console.log("Final category:", finalCategorie);

    return new Response(JSON.stringify({ categorie: finalCategorie }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("categorize-justificatif error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue", categorie: "compte_attente" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
