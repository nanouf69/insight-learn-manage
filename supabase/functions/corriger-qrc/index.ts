import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, reponseEtudiant, reponsesAttendues, matiereId, pointsQuestion, isCalcul, reponseQRC } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurée");

    // Safeguard: if no student response, return 0 immediately
    if (!reponseEtudiant || !String(reponseEtudiant).trim()) {
      return new Response(JSON.stringify({
        estCorrect: false,
        pointsObtenus: 0,
        nombrefautes: 0,
        explication: "Aucune réponse fournie.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isFrancais = matiereId === "francais";
    const nbReponsesAttendues = (reponsesAttendues || []).length;
    const safePoints = Math.max(Number(pointsQuestion) || 0, 0);

    let systemPrompt: string;
    let userPrompt: string;

    if (isCalcul) {
      systemPrompt = `Tu es un correcteur d'examen pour le permis de taxi/VTC (matière technique/gestion).
Tu dois évaluer une question QRC qui exige un CALCUL CHIFFRÉ.
Règles STRICTES pour les questions de calcul :
- L'étudiant doit fournir DEUX éléments pour obtenir tous les points :
  1. Le DÉTAIL DU CALCUL (les opérations arithmétiques)
  2. Le RÉSULTAT CORRECT avec l'UNITÉ si applicable
- Si résultat correct MAIS PAS le détail du calcul → MOITIÉ des points seulement
- Si résultat incorrect → 0 point
- IGNORE les fautes d'orthographe, accents, majuscules, ponctuation`;

      userPrompt = `Question : "${question}"
Réponse complète attendue : ${reponseQRC || (reponsesAttendues || []).join(" / ")}
Éléments de résultat attendus : ${(reponsesAttendues || []).join(" / ")}
Réponse de l'étudiant : "${reponseEtudiant}"
Points pour cette question : ${safePoints}

Analyse la réponse et évalue.`;
    } else if (isFrancais) {
      systemPrompt = `Tu es un correcteur d'examen de Français pour le permis de taxi/VTC.
Règles STRICTES :
- La réponse doit contenir l'idée principale attendue
- COMPTE LES FAUTES D'ORTHOGRAPHE : chaque tranche de 5 fautes retire 1 point
- Les accents manquants comptent comme fautes d'orthographe`;

      userPrompt = `Question : "${question}"
Réponse(s) attendue(s) : ${(reponsesAttendues || []).join(" / ")}
Réponse de l'étudiant : "${reponseEtudiant}"
Points pour cette question : ${safePoints}

Évalue la réponse.`;
    } else {
      systemPrompt = `Tu es un correcteur d'examen pour le permis de taxi/VTC (matière technique/réglementaire).
Règles STRICTES :
- IGNORE TOTALEMENT : fautes d'orthographe, accents, majuscules, ponctuation, abréviations
- Une réponse est correcte si elle contient l'idée principale, même mal écrite
- NOTATION AU PRORATA : compte combien de réponses attendues l'étudiant a mentionnées parmi les ${nbReponsesAttendues}
- Si N bonnes réponses sur ${nbReponsesAttendues} → (N / ${nbReponsesAttendues}) × ${safePoints} points`;

      userPrompt = `Question : "${question}"
Réponse(s) attendue(s) (${nbReponsesAttendues} éléments) : ${(reponsesAttendues || []).join(" / ")}
Réponse de l'étudiant : "${reponseEtudiant}"
Points pour cette question : ${safePoints}

Compte combien de réponses attendues l'étudiant a mentionnées (ignore orthographe).`;
    }

    // Use tool calling for structured output (more reliable than JSON parsing)
    const toolSchema = {
      type: "function",
      function: {
        name: "submit_correction",
        description: "Submit the correction result for a QRC question",
        parameters: {
          type: "object",
          properties: {
            estCorrect: { type: "boolean", description: "true if all expected answers are covered" },
            pointsObtenus: { type: "number", description: `Points awarded, between 0 and ${safePoints}` },
            nombrefautes: { type: "integer", description: "Number of spelling mistakes (for French only, 0 otherwise)" },
            explication: { type: "string", description: "Short explanation in French of the correction" },
          },
          required: ["estCorrect", "pointsObtenus", "nombrefautes", "explication"],
          additionalProperties: false,
        },
      },
    };

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
        tools: [toolSchema],
        tool_choice: { type: "function", function: { name: "submit_correction" } },
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Erreur gateway IA: ${response.status}`);
    }

    const aiData = await response.json();

    // Extract from tool call
    let result: any;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        result = null;
      }
    }

    // Fallback: try content as JSON
    if (!result) {
      const content = aiData.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      } catch { /* fallback below */ }
    }

    // If AI failed entirely, use deterministic fallback
    if (!result) {
      result = deterministicFallback(reponseEtudiant, reponsesAttendues || [], safePoints, isCalcul, nbReponsesAttendues);
    }

    // CRITICAL: Clamp points to never exceed max
    const rawPoints = Number(result.pointsObtenus) || 0;
    result.pointsObtenus = Math.min(Math.max(rawPoints, 0), safePoints);

    // French spelling deduction
    if (isFrancais && result.estCorrect) {
      const deduction = Math.floor((result.nombrefautes || 0) / 5);
      result.pointsObtenus = Math.max(0, safePoints - deduction);
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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function deterministicFallback(
  reponseEtudiant: string,
  reponsesAttendues: string[],
  pointsQuestion: number,
  isCalcul: boolean,
  nbReponsesAttendues: number,
) {
  const normalize = (s: string) =>
    (s || "").toLowerCase()
      .replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e")
      .replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o")
      .replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c")
      .replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

  if (isCalcul) {
    const repNorm = (reponseEtudiant || "").replace(/\s/g, "").toLowerCase();
    const hasResult = reponsesAttendues.some((r) => repNorm.includes(r.replace(/\s/g, "").toLowerCase()));
    const hasCalc = /\d+\s*[\/×x\*\-\+]\s*\d+/.test(reponseEtudiant || "") || /=\s*\d/.test(reponseEtudiant || "");
    let pts = 0;
    if (hasResult && hasCalc) pts = pointsQuestion;
    else if (hasResult) pts = Math.round(pointsQuestion * 5) / 10;
    return {
      estCorrect: hasResult && hasCalc,
      pointsObtenus: pts,
      nombrefautes: 0,
      explication: hasResult && hasCalc ? "Résultat + calcul corrects." : hasResult ? "Résultat sans détail calcul." : "Résultat incorrect.",
    };
  }

  const repNorm = normalize(reponseEtudiant);
  let found = 0;
  reponsesAttendues.forEach((mc) => {
    if (repNorm.includes(normalize(mc))) found++;
  });
  const ratio = nbReponsesAttendues > 0 ? found / nbReponsesAttendues : 0;
  const pts = Math.min(Math.round(ratio * pointsQuestion * 10) / 10, pointsQuestion);
  return {
    estCorrect: found >= nbReponsesAttendues,
    pointsObtenus: pts,
    nombrefautes: 0,
    explication: `Mots-clés : ${found}/${nbReponsesAttendues} trouvés.`,
  };
}