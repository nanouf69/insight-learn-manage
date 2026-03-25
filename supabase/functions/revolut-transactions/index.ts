import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth check (admin only) ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Parse optional query params ---
    const url = new URL(req.url);
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const count = url.searchParams.get("count") || "50";

    // --- Get latest Revolut token from DB ---
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("revolut_tokens")
      .select("access_token, expires_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ error: "No Revolut token found. Please reconnect." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check token expiry
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Revolut token expired. Please reconnect." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Fetch transactions from Revolut ---
    const params = new URLSearchParams({ count });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const revolutResponse = await fetch(
      `https://b2b.revolut.com/api/1.0/transactions?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenRow.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const revolutData = await revolutResponse.json();

    if (!revolutResponse.ok) {
      console.error("Revolut transactions fetch failed:", revolutData);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch transactions",
          details: revolutData,
        }),
        {
          status: revolutResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ transactions: revolutData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("revolut-transactions error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
