import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      apprenant_id,
      user_id,
      module_id,
      exercice_id,
      exercice_type,
      reponses,
      score,
      completed,
      updated_at,
      events,
    } = body ?? {};

    if (!apprenant_id || !user_id || !exercice_id || !exercice_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tentative en cours (pour l'horodatage du journal).
    const { data: current } = await supabase
      .from("reponses_apprenants")
      .select("completed, tentative")
      .eq("apprenant_id", apprenant_id)
      .eq("exercice_id", exercice_id)
      .maybeSingle();

    // Build the row — only include score if explicitly provided
    // to avoid overwriting an existing score with null.
    // IMPORTANT: once an exercise is completed, stale autosave requests from the
    // browser must never downgrade it back to completed=false.
    const row: Record<string, any> = {
      apprenant_id,
      user_id,
      exercice_id,
      exercice_type,
      reponses: reponses ?? {},
      completed: Boolean(completed),
      updated_at: updated_at ?? new Date().toISOString(),
    };

    if (score !== undefined && score !== null) {
      row.score = score;
    }

    if (!row.completed && current?.completed === true) {
      row.completed = true;
    }

    const { error } = await supabase
      .from("reponses_apprenants")
      .upsert(row, { onConflict: "apprenant_id,exercice_id" });

    if (error) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
          details: error.details,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Journal append-only : une ligne immuable par réponse cochée.
    // Ce journal n'est jamais modifié ni supprimé par les évolutions de contenu.
    if (Array.isArray(events) && events.length > 0) {
      const tentative = current?.tentative ?? 1;
      const rows = events
        .filter((e: any) => e && e.question_id)
        .slice(0, 500)
        .map((e: any) => ({
          apprenant_id,
          user_id,
          module_id: typeof module_id === "number" ? module_id : null,
          exercice_id,
          exercice_type,
          question_id: String(e.question_id),
          valeur: e.valeur ?? null,
          tentative: typeof e.tentative === "number" ? e.tentative : tentative,
          client_saved_at: e.client_saved_at ?? null,
        }));
      if (rows.length > 0) {
        const { error: journalError } = await supabase
          .from("reponses_apprenants_journal")
          .insert(rows);
        if (journalError) {
          console.error("[upsert-reponse-apprenant] journal error:", journalError.message);
          return new Response(
            JSON.stringify({ error: journalError.message, stage: "journal" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[upsert-reponse-apprenant] error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
