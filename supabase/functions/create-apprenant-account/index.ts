import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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

    const { data: claims, error: claimsErr } = await callerClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: claims.claims.sub,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Réservé aux administrateurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { apprenant_id, email } = await req.json();

    if (!apprenant_id || !email) {
      return new Response(
        JSON.stringify({ error: "apprenant_id et email requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if apprenant already has an account
    const { data: apprenant } = await supabaseAdmin
      .from("apprenants")
      .select("auth_user_id, nom, prenom")
      .eq("id", apprenant_id)
      .single();

    if (apprenant?.auth_user_id) {
      return new Response(
        JSON.stringify({ error: "Cet apprenant a déjà un compte" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate random password (8 chars, alphanumeric)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 8; i++) {
      password += chars[randomBytes[i] % chars.length];
    }

    // Create auth user with auto-confirm
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${apprenant?.prenom || ""} ${apprenant?.nom || ""}`.trim(),
        is_apprenant: true,
      },
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link auth user to apprenant
    await supabaseAdmin
      .from("apprenants")
      .update({ auth_user_id: authUser.user.id })
      .eq("id", apprenant_id);

    return new Response(
      JSON.stringify({
        success: true,
        password,
        email,
        message: `Compte créé pour ${email}. Mot de passe : ${password}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
