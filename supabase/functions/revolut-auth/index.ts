import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

async function createRevolutJwt(
  clientId: string,
  privateKeyPem: string
): Promise<string> {
  const cryptoKey = await importPrivateKey(privateKeyPem);
  const now = getNumericDate(new Date());

  return await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: clientId,
      sub: clientId,
      aud: "https://revolut.com",
      iat: now,
      exp: now + 90,
    },
    cryptoKey
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    if (!code) {
      console.error("[revolut-auth] Missing authorization code in request body");
      return new Response(
        JSON.stringify({ error: "Missing authorization code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[revolut-auth] Received code, starting token exchange...");

    const clientId = Deno.env.get("REVOLUT_CLIENT_ID");
    if (!clientId) throw new Error("REVOLUT_CLIENT_ID is not configured");

    const rawPrivateKey = Deno.env.get("REVOLUT_PRIVATE_KEY");
    if (!rawPrivateKey) throw new Error("REVOLUT_PRIVATE_KEY is not configured");
    const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

    const clientAssertion = await createRevolutJwt(clientId, privateKey);
    console.log("[revolut-auth] Client assertion JWT created");

    // Exchange code for token
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
    console.log("[revolut-auth] Revolut response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error("[revolut-auth] Token exchange failed:", JSON.stringify(tokenData));
      return new Response(
        JSON.stringify({ error: "Token exchange failed", details: tokenData }),
        { status: tokenResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[revolut-auth] Token exchange successful, storing in DB...");

    // Store token using service role (no auth required)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Delete old tokens first, then insert new one
    const { error: deleteError } = await supabaseAdmin
      .from("revolut_tokens")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows

    if (deleteError) {
      console.error("[revolut-auth] Failed to delete old tokens:", deleteError);
    }

    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from("revolut_tokens")
      .insert({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? null,
        token_type: tokenData.token_type ?? "Bearer",
        expires_in: tokenData.expires_in ?? null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[revolut-auth] DB insert error:", JSON.stringify(insertError));
      throw new Error(`Failed to store token: ${insertError.message}`);
    }

    console.log("[revolut-auth] Token stored successfully, id:", insertedData.id);

    return new Response(
      JSON.stringify({ success: true, expires_at: expiresAt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[revolut-auth] Unhandled error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
