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

    const isFrancais = matiereId === "francais";
    const nbReponsesAttendues = reponsesAttendues.length;

    let systemPrompt: string;
    let userPrompt: string;

    if (isCalcul) {
      // Prompt spécifique pour les questions de calcul
      systemPrompt = `Tu es un correcteur d'examen pour le permis de taxi/VTC (matière technique/gestion).
Tu dois évaluer une question QRC qui exige un CALCUL CHIFFRÉ.
Règles STRICTES pour les questions de calcul :
- L'étudiant doit fournir DEUX éléments pour obtenir tous les points :
  1. Le DÉTAIL DU CALCUL (les opérations arithmétiques, ex: "24000/5 = 4800")
  2. Le RÉSULTAT CORRECT avec l'UNITÉ si applicable (ex: "7 000 € HT")
- Si la réponse contient le résultat correct MAIS PAS le détail du calcul → MOITIÉ des points seulement
- Si la réponse contient le détail du calcul ET le résultat correct → TOUS les points
- Si le résultat est incorrect → 0 point
- IGNORE les fautes d'orthographe, accents, majuscules, ponctuation
- Réponds UNIQUEMENT avec un objet JSON valide, rien d'autre`;

      userPrompt = `Question : "${question}"
Réponse complète attendue (avec calcul) : ${reponseQRC || reponsesAttendues.join(" / ")}
Éléments de résultat attendus : ${reponsesAttendues.join(" / ")}
Réponse de l'étudiant : "${reponseEtudiant}"
Points pour cette question : ${pointsQuestion}

Analyse la réponse :
1. L'étudiant a-t-il fourni le DÉTAIL DU CALCUL (opérations arithmétiques visibles) ?
2. L'étudiant a-t-il trouvé le RÉSULTAT CORRECT ?

Retourne ce JSON EXACT :
{
  "estCorrect": true ou false (true seulement si calcul détaillé ET résultat correct),
  "pointsObtenus": nombre de points (${pointsQuestion} si calcul+résultat, ${Math.round(pointsQuestion * 5) / 10} si résultat sans calcul, 0 si résultat faux),
  "nombrefautes": 0,
  "hasDetailCalcul": true ou false,
  "hasResultatCorrect": true ou false,
  "isCalculQuestion": true,
  "explication": "courte explication précisant si le calcul est détaillé et si le résultat est correct"
}`;
    } else if (isFrancais) {
      systemPrompt = `Tu es un correcteur d'examen de Français pour le permis de taxi/VTC. 
Tu dois évaluer la réponse de l'étudiant en français.
Règles STRICTES :
- La réponse doit contenir l'idée principale attendue
- COMPTE LES FAUTES D'ORTHOGRAPHE : chaque tranche de 5 fautes retire 1 point
- Les accents manquants comptent comme fautes d'orthographe
- Les majuscules manquantes en début de phrase comptent
- Réponds UNIQUEMENT avec un objet JSON valide, rien d'autre`;

      userPrompt = `Question : "${question}"
Réponse(s) attendue(s) : ${reponsesAttendues.join(" / ")}
Réponse de l'étudiant : "${reponseEtudiant}"
Points pour cette question : ${pointsQuestion}

Évalue la réponse et retourne ce JSON EXACT :
{
  "estCorrect": true ou false,
  "pointsObtenus": nombre de points obtenus (entre 0 et ${pointsQuestion}),
  "nombrefautes": nombre de fautes d'orthographe comptées,
  "explication": "courte explication en une phrase"
}`;
    } else {
      systemPrompt = `Tu es un correcteur d'examen pour le permis de taxi/VTC (matière technique/réglementaire).
Tu dois évaluer si la réponse de l'étudiant contient les éléments essentiels attendus.
Règles STRICTES :
- IGNORE TOTALEMENT : les fautes d'orthographe, les accents, les majuscules/minuscules, la ponctuation, les abréviations, les raccourcis d'écriture
- Une réponse est correcte si elle contient l'idée principale, même mal écrite
- Exemples acceptés : "pdc" pour "permis de conduire", "carte pro" pour "carte professionnelle", "cgt" pour "code général des transports", sans accents, etc.
- NOTATION AU PRORATA : compte combien de réponses attendues l'étudiant a mentionnées parmi les ${nbReponsesAttendues} réponses possibles
- Si l'étudiant donne N bonnes réponses sur ${nbReponsesAttendues} attendues, il obtient (N / ${nbReponsesAttendues}) × ${pointsQuestion} points, arrondi au dixième
- Si l'étudiant donne au moins ${nbReponsesAttendues} bonnes réponses (même s'il en écrit plus), il obtient le maximum de points
- Réponds UNIQUEMENT avec un objet JSON valide, rien d'autre`;

      userPrompt = `Question : "${question}"
Réponse(s) attendue(s) (${nbReponsesAttendues} éléments) : ${reponsesAttendues.join(" / ")}
Réponse de l'étudiant : "${reponseEtudiant}"
Points pour cette question : ${pointsQuestion}

Compte combien de réponses attendues l'étudiant a mentionnées (ignore orthographe, accents, majuscules, abréviations).
Si l'étudiant mentionne N éléments corrects sur ${nbReponsesAttendues} attendus :
- pointsObtenus = arrondi de (N / ${nbReponsesAttendues}) × ${pointsQuestion}
- estCorrect = true si N >= ${nbReponsesAttendues}, sinon false (mais il peut quand même avoir des points partiels)

Retourne ce JSON EXACT :
{
  "estCorrect": true ou false (true seulement si toutes les réponses attendues sont couvertes),
  "pointsObtenus": nombre de points au prorata (entre 0 et ${pointsQuestion}),
  "nombrefautes": 0,
  "nbReponsesCorrectes": nombre de réponses attendues trouvées dans la réponse de l'étudiant,
  "nbReponsesAttendues": ${nbReponsesAttendues},
  "explication": "courte explication mentionnant les éléments trouvés et manquants"
}`;
    }

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
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Pas de JSON trouvé");
      result = JSON.parse(jsonMatch[0]);
    } catch {
      if (isCalcul) {
        // Fallback calcul : vérifier si le résultat numérique est présent
        const repNormalisee = (reponseEtudiant || "").replace(/\s/g, "").toLowerCase();
        const hasResult = reponsesAttendues.some((r: string) => {
          const rNorm = r.replace(/\s/g, "").toLowerCase();
          return repNormalisee.includes(rNorm);
        });
        const hasCalcDetail = /\d+\s*[\/×x\*\-\+]\s*\d+/.test(reponseEtudiant || "") || /=\s*\d/.test(reponseEtudiant || "");
        
        let pts = 0;
        if (hasResult && hasCalcDetail) pts = pointsQuestion;
        else if (hasResult) pts = Math.round(pointsQuestion * 5) / 10;
        
        result = {
          estCorrect: hasResult && hasCalcDetail,
          pointsObtenus: pts,
          nombrefautes: 0,
          hasDetailCalcul: hasCalcDetail,
          hasResultatCorrect: hasResult,
          isCalculQuestion: true,
          explication: hasResult && hasCalcDetail
            ? "Résultat correct avec détail du calcul."
            : hasResult
            ? `Résultat correct mais le détail du calcul est manquant → ${pts}/${pointsQuestion} pts`
            : "Résultat incorrect.",
        };
      } else {
        // Fallback : correction par mots-clés avec prorata
        const repNormalisee = (reponseEtudiant || "").toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, "");
        let nbTrouvees = 0;
        reponsesAttendues.forEach((mc: string) => {
          const mcNormalise = mc.toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, "");
          if (repNormalisee.includes(mcNormalise)) nbTrouvees++;
        });
        const ratio = nbReponsesAttendues > 0 ? nbTrouvees / nbReponsesAttendues : 0;
        const pts = Math.round(ratio * pointsQuestion * 10) / 10;
        result = {
          estCorrect: nbTrouvees >= nbReponsesAttendues,
          pointsObtenus: Math.min(pts, pointsQuestion),
          nombrefautes: 0,
          nbReponsesCorrectes: nbTrouvees,
          nbReponsesAttendues: nbReponsesAttendues,
          explication: `Correction automatique par mots-clés : ${nbTrouvees}/${nbReponsesAttendues} éléments trouvés`,
        };
      }
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
