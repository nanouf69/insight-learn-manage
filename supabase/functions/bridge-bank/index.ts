import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BRIDGE_API_URL = "https://api.bridgeapi.io/v3/aggregation";
const BRIDGE_VERSION = "2025-01-15";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientId = Deno.env.get("BRIDGE_CLIENT_ID");
  const clientSecret = Deno.env.get("BRIDGE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: "Bridge API credentials not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, user_uuid, external_user_id } = await req.json();
    const bridgeHeaders = {
      "Bridge-Version": BRIDGE_VERSION,
      "Client-Id": clientId,
      "Client-Secret": clientSecret,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    // Action: create_user
    if (action === "create_user") {
      const res = await fetch(`${BRIDGE_API_URL}/users`, {
        method: "POST",
        headers: bridgeHeaders,
        body: JSON.stringify({ external_user_id: external_user_id || `ftransport_${Date.now()}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Bridge create_user failed [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: authenticate_user
    if (action === "authenticate") {
      const body: Record<string, string> = {};
      if (user_uuid) body.user_uuid = user_uuid;
      else if (external_user_id) body.external_user_id = external_user_id;
      else throw new Error("user_uuid or external_user_id required");

      const res = await fetch(`${BRIDGE_API_URL}/authorization/token`, {
        method: "POST",
        headers: bridgeHeaders,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Bridge authenticate failed [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: create_connect_session (returns URL for user to connect bank)
    if (action === "connect_session") {
      // First authenticate
      const authBody: Record<string, string> = {};
      if (user_uuid) authBody.user_uuid = user_uuid;
      else if (external_user_id) authBody.external_user_id = external_user_id;
      else throw new Error("user_uuid or external_user_id required");

      const authRes = await fetch(`${BRIDGE_API_URL}/authorization/token`, {
        method: "POST",
        headers: bridgeHeaders,
        body: JSON.stringify(authBody),
      });
      const authData = await authRes.json();
      if (!authRes.ok) throw new Error(`Bridge auth failed [${authRes.status}]: ${JSON.stringify(authData)}`);

      const accessToken = authData.access_token;

      const res = await fetch(`${BRIDGE_API_URL}/connect-sessions`, {
        method: "POST",
        headers: {
          ...bridgeHeaders,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          country: "fr",
          prefill_email: "contact@ftransport.fr",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Bridge connect_session failed [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: list_accounts
    if (action === "list_accounts") {
      const authBody: Record<string, string> = {};
      if (user_uuid) authBody.user_uuid = user_uuid;
      else if (external_user_id) authBody.external_user_id = external_user_id;
      else throw new Error("user_uuid or external_user_id required");

      const authRes = await fetch(`${BRIDGE_API_URL}/authorization/token`, {
        method: "POST",
        headers: bridgeHeaders,
        body: JSON.stringify(authBody),
      });
      const authData = await authRes.json();
      if (!authRes.ok) throw new Error(`Bridge auth failed [${authRes.status}]: ${JSON.stringify(authData)}`);

      const res = await fetch(`${BRIDGE_API_URL}/accounts?limit=100`, {
        headers: {
          ...bridgeHeaders,
          Authorization: `Bearer ${authData.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Bridge list_accounts failed [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: list_transactions
    if (action === "list_transactions") {
      const authBody: Record<string, string> = {};
      if (user_uuid) authBody.user_uuid = user_uuid;
      else if (external_user_id) authBody.external_user_id = external_user_id;
      else throw new Error("user_uuid or external_user_id required");

      const authRes = await fetch(`${BRIDGE_API_URL}/authorization/token`, {
        method: "POST",
        headers: bridgeHeaders,
        body: JSON.stringify(authBody),
      });
      const authData = await authRes.json();
      if (!authRes.ok) throw new Error(`Bridge auth failed [${authRes.status}]: ${JSON.stringify(authData)}`);

      const res = await fetch(`${BRIDGE_API_URL}/transactions?limit=500`, {
        headers: {
          ...bridgeHeaders,
          Authorization: `Bearer ${authData.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Bridge list_transactions failed [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: list_users (for admin)
    if (action === "list_users") {
      const res = await fetch(`${BRIDGE_API_URL}/users?limit=100`, {
        headers: bridgeHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Bridge list_users failed [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Bridge API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
