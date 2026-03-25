import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Import a PEM-encoded RSA private key as a CryptoKey for RS256 signing.
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, "")
    .replace(/-----END (RSA )?PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/**
 * Create a signed JWT (RS256) for Revolut Business API client assertion.
 */
async function createRevolutJwt(
  clientId: string,
  privateKeyPem: string
): Promise<string> {
  const cryptoKey = await importPrivateKey(privateKeyPem);
  const now = getNumericDate(new Date());

  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: clientId,
      sub: clientId,
      aud: "https://revolut.com",
      iat: now,
      exp: now + 90, // 90 seconds validity
    },
    cryptoKey
  );

  return jwt;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth check ---
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

    // --- Parse body ---
    const { code } = await req.json();
    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing authorization code" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Build signed JWT for Revolut ---
    const clientId = Deno.env.get("REVOLUT_CLIENT_ID");
    if (!clientId) {
      throw new Error("REVOLUT_CLIENT_ID is not configured");
    }

    const privateKey = Deno.env.get("REVOLUT_PRIVATE_KEY");
    if (!privateKey) {
      throw new Error("REVOLUT_PRIVATE_KEY is not configured");
    }

    const clientAssertion = await createRevolutJwt(clientId, privateKey);

    // --- Exchange code for token using client_assertion ---
    const tokenResponse = await fetch(
      "https://b2b.revolut.com/api/1.0/auth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_assertion_type:
            "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          client_assertion: clientAssertion,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Revolut token exchange failed:", tokenData);
      return new Response(
        JSON.stringify({
          error: "Token exchange failed",
          details: tokenData,
        }),
        {
          status: tokenResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Store token in DB (service role to bypass RLS) ---
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    const { error: insertError } = await supabaseAdmin
      .from("revolut_tokens")
      .insert({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? null,
        token_type: tokenData.token_type ?? "Bearer",
        expires_in: tokenData.expires_in ?? null,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("DB insert error:", insertError);
      throw new Error(`Failed to store token: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, expires_at: expiresAt }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("revolut-auth error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
