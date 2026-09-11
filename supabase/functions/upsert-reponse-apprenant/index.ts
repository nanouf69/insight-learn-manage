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

    const authorization = req.headers.get("Authorization") ?? "";
    const tokenFromQuery = new URL(req.url).searchParams.get("access_token") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "") || tokenFromQuery;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (!apprenant_id || !exercice_id || !exercice_type || typeof reponses !== "object" || Array.isArray(reponses)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveUserId = authData.user.id;
    const { data: learner, error: learnerError } = await supabase
      .from("apprenants")
      .select("id")
      .eq("id", apprenant_id)
      .eq("auth_user_id", effectiveUserId)
      .maybeSingle();
    if (learnerError || !learner) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeEvents = Array.isArray(events) ? events.slice(0, 500) : [];
    const { data, error } = await supabase.rpc("persist_answer_batch", {
      p_apprenant_id: apprenant_id,
      p_user_id: effectiveUserId,
      p_module_id: typeof module_id === "number" ? module_id : null,
      p_exercice_id: exercice_id,
      p_exercice_type: exercice_type,
      p_reponses: reponses ?? {},
      p_completed: Boolean(completed),
      p_score: score ?? null,
      p_updated_at: updated_at ?? new Date().toISOString(),
      p_events: safeEvents,
    });

    if (error || !data?.[0]?.saved) {
      return new Response(
        JSON.stringify({
          error: error?.message ?? "Save was not confirmed",
          code: error?.code,
          details: error?.details,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const confirmation = data[0];
    return new Response(JSON.stringify({
      success: true,
      confirmed: true,
      exercice_id,
      tentative: confirmation.stored_tentative,
      updated_at: confirmation.stored_updated_at,
      accepted_event_ids: confirmation.accepted_event_ids ?? [],
    }), {
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
