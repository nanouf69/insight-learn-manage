import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: callerUser }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !callerUser) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: callerUser.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Réservé aux administrateurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { apprenant_id } = await req.json();

    if (!apprenant_id) {
      return new Response(
        JSON.stringify({ error: "apprenant_id requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get apprenant with auth_user_id
    const { data: apprenant, error: fetchErr } = await supabaseAdmin
      .from("apprenants")
      .select("auth_user_id, nom, prenom, email")
      .eq("id", apprenant_id)
      .single();

    if (fetchErr || !apprenant) {
      return new Response(
        JSON.stringify({ error: "Apprenant introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apprenant.auth_user_id) {
      return new Response(
        JSON.stringify({ error: "Cet apprenant n'a pas de compte cours" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authUserId = apprenant.auth_user_id;

    // Delete all related data
    await supabaseAdmin.from("apprenant_connexions").delete().eq("apprenant_id", apprenant_id);
    await supabaseAdmin.from("apprenant_module_activites").delete().eq("apprenant_id", apprenant_id);
    await supabaseAdmin.from("apprenant_module_completion").delete().eq("apprenant_id", apprenant_id);
    await supabaseAdmin.from("apprenant_quiz_results").delete().eq("apprenant_id", apprenant_id);

    // Delete the auth user
    const { error: deleteAuthErr } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
    if (deleteAuthErr) {
      console.error("Error deleting auth user:", deleteAuthErr);
      return new Response(
        JSON.stringify({ error: `Erreur suppression compte auth : ${deleteAuthErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear auth_user_id on the apprenant
    await supabaseAdmin
      .from("apprenants")
      .update({ auth_user_id: null })
      .eq("id", apprenant_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Compte cours supprimé pour ${apprenant.prenom} ${apprenant.nom}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
