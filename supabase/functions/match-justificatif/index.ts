import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, transaction, justificatifs, selected_justificatif } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY manquant");

    let prompt = "";

    if (mode === "suggest") {
      // Mode 1: suggest best matches before linking
      const justifList = justificatifs.map((j: any, i: number) =>
        `[${i}] Fichier: ${j.nom_fichier} | Fournisseur: ${j.fournisseur || "?"} | Montant: ${j.montant_ttc != null ? j.montant_ttc + "€" : "?"} | Date: ${j.date_operation || "?"} | Catégorie: ${j.categorie || "?"}`
      ).join("\n");

      prompt = `Tu es un comptable expert. Analyse cette transaction bancaire et classe les justificatifs disponibles par pertinence.

TRANSACTION:
- Libellé: ${transaction.libelle}
- Montant: ${Math.abs(transaction.montant)}€ (${transaction.montant < 0 ? "débit" : "crédit"})
- Date: ${transaction.date_operation}
- Fournisseur connu: ${transaction.fournisseur_client || "inconnu"}

JUSTIFICATIFS DISPONIBLES:
${justifList}

Réponds UNIQUEMENT avec un JSON valide (rien d'autre) :
{
  "scores": [
    { "index": 0, "score": 95, "raison": "Montant identique + même fournisseur" },
    ...
  ],
  "meilleur_index": 0,
  "analyse": "Explication courte en 1-2 phrases"
}

score = 0-100 (100 = match parfait). Si aucun justificatif ne correspond, score < 30.`;

    } else if (mode === "confirm") {
      // Mode 2: confirm the link after selection
      prompt = `Tu es un comptable expert. Valide ce rapprochement bancaire.

TRANSACTION:
- Libellé: ${transaction.libelle}
- Montant: ${Math.abs(transaction.montant)}€ (${transaction.montant < 0 ? "débit" : "crédit"})
- Date: ${transaction.date_operation}

JUSTIFICATIF ASSOCIÉ:
- Fichier: ${selected_justificatif.nom_fichier}
- Fournisseur: ${selected_justificatif.fournisseur || "?"}
- Montant TTC: ${selected_justificatif.montant_ttc != null ? selected_justificatif.montant_ttc + "€" : "?"}
- Date: ${selected_justificatif.date_operation || "?"}
- Catégorie: ${selected_justificatif.categorie || "non catégorisé"}

Réponds UNIQUEMENT avec un JSON valide :
{
  "valide": true,
  "confiance": 90,
  "message": "Message de confirmation ou avertissement en 1 phrase",
  "alerte": null
}

Si montant divergent ou fournisseur incohérent, valide=false et alerte="raison courte".`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite IA atteinte" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Erreur IA: ${response.status} - ${errBody}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";
    console.log("AI match response:", rawContent);

    let result;
    try {
      result = JSON.parse(rawContent);
    } catch {
      result = { error: "Réponse IA invalide" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("match-justificatif error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
