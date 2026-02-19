import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, reponseEtudiant, reponsesAttendues, matiereId, pointsQuestion } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurée");

    const isFrancais = matiereId === "francais";

    const systemPrompt = isFrancais
      ? `Tu es un correcteur d'examen de Français pour le permis de taxi/VTC. 
Tu dois évaluer la réponse de l'étudiant en français.
Règles STRICTES :
- La réponse doit contenir l'idée principale attendue
- COMPTE LES FAUTES D'ORTHOGRAPHE : chaque tranche de 5 fautes retire 1 point
- Les accents manquants comptent comme fautes d'orthographe
- Les majuscules manquantes en début de phrase comptent
- Réponds UNIQUEMENT avec un objet JSON valide, rien d'autre`
      : `Tu es un correcteur d'examen pour le permis de taxi/VTC (matière technique/réglementaire).
Tu dois évaluer si la réponse de l'étudiant contient les éléments essentiels attendus.
Règles STRICTES :
- IGNORE TOTALEMENT : les fautes d'orthographe, les accents, les majuscules/minuscules, la ponctuation, les abréviations, les raccourcis d'écriture
- Une réponse est correcte si elle contient l'idée principale, même mal écrite
- Exemples acceptés : "pdc" pour "permis de conduire", "carte pro" pour "carte professionnelle", "cgt" pour "code général des transports", sans accents, etc.
- Réponds UNIQUEMENT avec un objet JSON valide, rien d'autre`;

    const userPrompt = isFrancais
      ? `Question : "${question}"
Réponse(s) attendue(s) : ${reponsesAttendues.join(" / ")}
Réponse de l'étudiant : "${reponseEtudiant}"
Points pour cette question : ${pointsQuestion}

Évalue la réponse et retourne ce JSON EXACT :
{
  "estCorrect": true ou false,
  "pointsObtenus": nombre de points obtenus (entre 0 et ${pointsQuestion}),
  "nombrefautes": nombre de fautes d'orthographe comptées,
  "explication": "courte explication en une phrase"
}`
      : `Question : "${question}"
Réponse(s) attendue(s) : ${reponsesAttendues.join(" / ")}
Réponse de l'étudiant : "${reponseEtudiant}"
Points pour cette question : ${pointsQuestion}

L'étudiant a-t-il répondu correctement (même avec fautes/abréviations/sans accents) ?
Retourne ce JSON EXACT :
{
  "estCorrect": true ou false,
  "pointsObtenus": ${pointsQuestion} si correct, sinon 0,
  "nombrefautes": 0,
  "explication": "courte explication en une phrase"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans un moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants pour la correction IA." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Erreur gateway IA: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse le JSON retourné par l'IA
    let result;
    try {
      // Extraire le JSON même si l'IA ajoute du texte autour
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Pas de JSON trouvé");
      result = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback : correction par mots-clés si l'IA échoue
      const repNormalisee = reponseEtudiant.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      const estCorrect = reponsesAttendues.some(mc => {
        const mcNormalise = mc.toLowerCase().replace(/[^a-z0-9 ]/g, "");
        return repNormalisee.includes(mcNormalise);
      });
      result = {
        estCorrect,
        pointsObtenus: estCorrect ? pointsQuestion : 0,
        nombrefautes: 0,
        explication: "Correction automatique par mots-clés (fallback)",
      };
    }

    // Sécurité : pour le français, appliquer la déduction -1pt/5 fautes
    if (isFrancais && result.estCorrect) {
      const deduction = Math.floor((result.nombrefautes || 0) / 5);
      result.pointsObtenus = Math.max(0, pointsQuestion - deduction);
      if (deduction > 0) {
        result.explication += ` (${result.nombrefautes} fautes → -${deduction} pt)`;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("corriger-qrc error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
