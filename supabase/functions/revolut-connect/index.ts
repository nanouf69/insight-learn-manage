import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Handle literal \n from env secrets + strip PEM headers
  const normalized = pem.replace(/\\n/g, "\n");
  const pemContents = normalized
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
  privateKeyPem: string,
  redirectUri: string
): Promise<string> {
  const cryptoKey = await importPrivateKey(privateKeyPem);
  const now = getNumericDate(new Date());

  return await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: redirectUri,
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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    // Get config
    const clientId = Deno.env.get("REVOLUT_CLIENT_ID");
    if (!clientId) throw new Error("REVOLUT_CLIENT_ID is not configured");

    const privateKey = Deno.env.get("REVOLUT_PRIVATE_KEY");
    if (!privateKey) throw new Error("REVOLUT_PRIVATE_KEY is not configured");

    const { redirect_uri } = await req.json().catch(() => ({}));
    if (!redirect_uri) {
      return new Response(
        JSON.stringify({ error: "Missing redirect_uri" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate the signed JWT for the authorization request
    const jwt = await createRevolutJwt(clientId, privateKey, redirect_uri);

    // Build Revolut authorization URL per their Business API docs
    const authUrl = new URL("https://b2b.revolut.com/app-confirm");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirect_uri);
    authUrl.searchParams.set("response_type", "code");
    // The JWT is passed as request parameter (signed request object)
    authUrl.searchParams.set("request", jwt);

    return new Response(
      JSON.stringify({ auth_url: authUrl.toString() }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("revolut-connect error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
