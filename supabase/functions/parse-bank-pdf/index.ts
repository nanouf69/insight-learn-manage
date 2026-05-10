import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { fileBase64, fileName } = await req.json();
    if (!fileBase64) {
      return new Response(JSON.stringify({ error: "fileBase64 requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableApiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyse ce relevé bancaire PDF (BNP Paribas, Revolut Pro, ou autre banque française).
Extrais TOUTES les opérations / transactions du relevé.

Réponds UNIQUEMENT avec un JSON valide (aucun texte avant/après). Format exact :
{"banque":"BNP Paribas","transactions":[{"date_operation":"2025-01-15","libelle":"VIREMENT DUPONT JEAN","montant":150.00,"solde":1234.56}]}

Règles :
- "banque" : "BNP Paribas", "Revolut Pro" ou nom détecté
- "date_operation" : format YYYY-MM-DD
- "montant" : nombre décimal, POSITIF pour crédit (entrée), NÉGATIF pour débit (sortie)
- "libelle" : description complète de l'opération
- "solde" : solde après opération si disponible, sinon null
- N'inclus PAS les lignes "Solde initial", "Solde final", "Total débits", "Total crédits"
- Inclus uniquement les vraies opérations bancaires`
            },
            { type: "image_url", image_url: { url: `data:application/pdf;base64,${fileBase64}` } }
          ]
        }],
        temperature: 0,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return new Response(JSON.stringify({ error: "Erreur IA: " + errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const m = content.match(/\{[\s\S]*\}/);
    if (m) content = m[0];

    let parsed;
    try { parsed = JSON.parse(content); }
    catch {
      return new Response(JSON.stringify({ error: "JSON invalide de l'IA", raw: content.substring(0, 500) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      banque: parsed.banque || "Inconnue",
      transactions: parsed.transactions || [],
      fileName,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erreur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
