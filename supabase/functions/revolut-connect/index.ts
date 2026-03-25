import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePrivateKey(rawPem: string): string {
  return rawPem
    .trim()
    .replace(/^['"`]|['"`]$/g, "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const normalizedPem = normalizePrivateKey(pem);
  const hasBegin = /-----BEGIN (RSA )?PRIVATE KEY-----/.test(normalizedPem);
  const hasEnd = /-----END (RSA )?PRIVATE KEY-----/.test(normalizedPem);
  const hasPemMarkers = hasBegin && hasEnd;

  const keyBody = hasPemMarkers
    ? normalizedPem
        .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, "")
        .replace(/-----END (RSA )?PRIVATE KEY-----/g, "")
    : normalizedPem;

  if (!hasPemMarkers) {
    console.warn(
      "REVOLUT_PRIVATE_KEY sans marqueurs PEM BEGIN/END, tentative de décodage brut"
    );
  }

  const base64Body = keyBody
    .replace(/\s/g, "")
    .replace(/[^A-Za-z0-9+/=]/g, "");

  if (!base64Body) {
    throw new Error("REVOLUT_PRIVATE_KEY vide après normalisation");
  }

  const paddedBase64 = base64Body + "=".repeat((4 - (base64Body.length % 4)) % 4);

  console.log("revolut-connect key check", {
    hasBegin,
    hasEnd,
    normalizedLength: normalizedPem.length,
    base64Length: base64Body.length,
  });

  let binaryDer: Uint8Array;
  try {
    binaryDer = Uint8Array.from(atob(paddedBase64), (c) => c.charCodeAt(0));
  } catch {
    throw new Error(
      "REVOLUT_PRIVATE_KEY invalide: impossible de décoder le contenu base64 PKCS8"
    );
  }

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
  redirectUri: string,
  scope: string,
  state: string
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
      jti: crypto.randomUUID(),
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope,
      state,
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

    const { redirect_uri, scope: requestedScope, state: requestedState } = await req.json().catch(() => ({}));
    if (!redirect_uri) {
      return new Response(JSON.stringify({ error: "Missing redirect_uri" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scope = requestedScope || "READ";
    const state = requestedState || crypto.randomUUID();

    console.log("revolut-connect request", {
      hasClientId: !!clientId,
      hasPrivateKey: !!privateKey,
      redirectUri: redirect_uri,
      scope,
      hasState: !!state,
    });

    // Generate signed request object JWT (RS256)
    const jwt = await createRevolutJwt(clientId, privateKey, redirect_uri, scope, state);

    // Build Revolut authorization URL (OAuth2 + signed request object)
    const authUrl = new URL("https://b2b.revolut.com/app-confirm");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirect_uri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("request", jwt);

    return new Response(JSON.stringify({ auth_url: authUrl.toString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("revolut-connect error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
