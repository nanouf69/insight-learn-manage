import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { mode, transaction, justificatifs, selected_justificatif } = await req.json();

    // Mode 1: Suggest best matches (simple algorithmic matching)
    if (mode === "suggest") {
      const scores = justificatifs.map((j: any, index: number) => {
        let score = 0;
        const reasons = [];

        const txAmount = Math.abs(transaction.montant);
        const jAmount = j.montant_ttc != null ? Math.abs(j.montant_ttc) : null;

        if (jAmount !== null) {
          const diff = Math.abs(txAmount - jAmount);
          if (diff === 0) {
            score += 40;
            reasons.push("Montant identique");
          } else if (diff < 1) {
            score += 35;
            reasons.push("Montant quasi identique");
          } else if (diff / txAmount < 0.1) {
            score += 25;
            reasons.push("Montant très proche");
          }
        }

        const txFourn = (transaction.fournisseur_client || "").toLowerCase().trim();
        const jFourn = (j.fournisseur || "").toLowerCase().trim();
        if (txFourn && jFourn && (txFourn.includes(jFourn) || jFourn.includes(txFourn))) {
          score += 30;
          reasons.push("Fournisseur correspondant");
        }

        const txDate = transaction.date_operation;
        const jDate = j.date_operation;
        if (txDate && jDate) {
          const d1 = new Date(txDate);
          const d2 = new Date(jDate);
          const diffDays = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays === 0) {
            score += 30;
            reasons.push("Même date");
          } else if (diffDays <= 1) {
            score += 20;
            reasons.push("Date à 1 jour près");
          } else if (diffDays <= 7) {
            score += 10;
            reasons.push("Date dans la semaine");
          }
        }

        let finalScore = score;
        let raison = "";
        if (reasons.length > 0) {
          finalScore = Math.min(score, 95);
          raison = reasons.slice(0, 3).join(" + ");
        }

        return { index, score: finalScore, raison };
      });

      scores.sort((a: any, b: any) => b.score - a.score);

      const result = {
        scores: scores,
        meilleur_index: scores.length > 0 ? scores[0].index : null,
        analyse: scores.length > 0 && scores[0].score > 30
          ? `Meilleur match: ${scores[0].score}/100`
          : "Aucun justificatif ne correspond significativement"
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: Confirm the link after selection
    if (mode === "confirm") {
      const txAmount = Math.abs(transaction.montant);
      const jAmount = selected_justificatif.montant_ttc != null ? Math.abs(selected_justificatif.montant_ttc) : null;

      let confiance = 80;
      let alerte = null;

      if (jAmount !== null) {
        const diff = Math.abs(txAmount - jAmount);
        if (diff === 0) {
          confiance = 98;
        } else if (diff < 1) {
          confiance = 95;
        } else if (diff / txAmount < 0.1) {
          confiance = 85;
        } else if (diff / txAmount < 0.2) {
          confiance = 70;
          alerte = "Montant différent de plus de 10%";
        } else {
          confiance = 50;
          alerte = "Montant très différent, vérifier";
        }
      }

      const result = {
        valide: confiance >= 60,
        confiance: confiance,
        message: confiance >= 90
          ? "Rapprochement validé - Montants et fournisseur cohérents"
          : confiance >= 70
          ? "Rapprochement acceptable avec légère différence"
          : "Rapprochement à vérifier avant validation",
        alerte: alerte
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Mode inconnu" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("match-justificatif error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
