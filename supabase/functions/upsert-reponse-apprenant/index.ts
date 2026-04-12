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
      exercice_id,
      exercice_type,
      reponses,
      score,
      completed,
      updated_at,
    } = body ?? {};

    if (!apprenant_id || !user_id || !exercice_id || !exercice_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the row — only include score if explicitly provided
    // to avoid overwriting an existing score with null
    const row: Record<string, any> = {
      apprenant_id,
      user_id,
      exercice_id,
      exercice_type,
      reponses: reponses ?? {},
      completed: completed ?? false,
      updated_at: updated_at ?? new Date().toISOString(),
    };

    if (score !== undefined && score !== null) {
      row.score = score;
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

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});