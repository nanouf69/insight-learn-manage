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

function toBase64Body(input: string): string {
  return input.replace(/\s/g, "").replace(/[^A-Za-z0-9+/=]/g, "");
}

function tryDecodeWrappedPem(normalized: string): string {
  if (/-----BEGIN (RSA )?PRIVATE KEY-----/.test(normalized)) {
    return normalized;
  }

  const compact = toBase64Body(normalized);

  try {
    const decoded = atob(compact);
    if (/-----BEGIN (RSA )?PRIVATE KEY-----/.test(decoded)) {
      return normalizePrivateKey(decoded);
    }
  } catch {
    // noop: keep original value
  }

  return normalized;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const containsEscapedNewlines = /\\n/.test(pem) || /\\r\\n/.test(pem);
  const normalizedPem = tryDecodeWrappedPem(normalizePrivateKey(pem));
  const hasBeginPkcs8 = /-----BEGIN PRIVATE KEY-----/.test(normalizedPem);
  const hasEndPkcs8 = /-----END PRIVATE KEY-----/.test(normalizedPem);
  const hasBeginPkcs1 = /-----BEGIN RSA PRIVATE KEY-----/.test(normalizedPem);
  const hasEndPkcs1 = /-----END RSA PRIVATE KEY-----/.test(normalizedPem);

  if (hasBeginPkcs1 || hasEndPkcs1) {
    throw new Error(
      "REVOLUT_PRIVATE_KEY est en PKCS#1 (BEGIN RSA PRIVATE KEY). Revolut nécessite une clé PKCS#8 (BEGIN PRIVATE KEY)."
    );
  }

  if (hasBeginPkcs8 !== hasEndPkcs8) {
    throw new Error(
      "REVOLUT_PRIVATE_KEY PEM incomplet: marqueurs BEGIN/END PRIVATE KEY incohérents"
    );
  }

  const hasPemMarkers = hasBeginPkcs8 && hasEndPkcs8;
  const keyBody = hasPemMarkers
    ? normalizedPem
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
    : normalizedPem;

  const base64Body = toBase64Body(keyBody);

  if (!base64Body) {
    throw new Error("REVOLUT_PRIVATE_KEY vide après normalisation");
  }

  const paddedBase64 =
    base64Body + "=".repeat((4 - (base64Body.length % 4)) % 4);

  console.log("revolut-connect key check", {
    containsEscapedNewlines,
    hasBeginPkcs8,
    hasEndPkcs8,
    hasBeginPkcs1,
    hasEndPkcs1,
    normalizedLength: normalizedPem.length,
    base64Length: base64Body.length,
  });

  // Log first and last chars (safe — not the key itself) to debug truncation
  console.log("revolut-connect key debug", {
    rawLength: pem.length,
    first20: pem.substring(0, 20),
    last20: pem.substring(pem.length - 20),
    normalizedFirst30: normalizedPem.substring(0, 30),
    normalizedLast30: normalizedPem.substring(normalizedPem.length - 30),
  });

  if (base64Body.length < 512) {
    throw new Error(
      `REVOLUT_PRIVATE_KEY invalide: longueur base64=${base64Body.length} (attendu ~1700+). La clé semble tronquée ou incomplète. Longueur brute du secret: ${pem.length} caractères.`
    );
  }

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

function buildRevolutAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  jwt: string;
}): string {
  const authUrl = new URL("https://b2b.revolut.com/app-confirm");
  authUrl.searchParams.set("client_id", params.clientId);
  authUrl.searchParams.set("redirect_uri", params.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", params.scope);
  authUrl.searchParams.set("state", params.state);
  authUrl.searchParams.set("request", params.jwt);

  if (authUrl.hostname !== "b2b.revolut.com" || authUrl.pathname !== "/app-confirm") {
    throw new Error("URL de consentement Revolut invalide");
  }

  return authUrl.toString();
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

    const { redirect_uri, scope: requestedScope, state: requestedState } =
      await req.json().catch(() => ({}));
    if (!redirect_uri) {
      return new Response(JSON.stringify({ error: "Missing redirect_uri" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let redirectUrl: URL;
    try {
      redirectUrl = new URL(redirect_uri);
    } catch {
      return new Response(JSON.stringify({ error: "redirect_uri invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (redirectUrl.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "redirect_uri must be https" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scope = requestedScope || "READ";
    const state = requestedState || crypto.randomUUID();

    console.log("revolut-connect request", {
      hasClientId: !!clientId,
      hasPrivateKey: !!privateKey,
      redirectUri: redirectUrl.toString(),
      scope,
      hasState: !!state,
    });

    // Generate signed request object JWT (RS256)
    const jwt = await createRevolutJwt(
      clientId,
      privateKey,
      redirectUrl.toString(),
      scope,
      state
    );

    const authUrl = buildRevolutAuthorizationUrl({
      clientId,
      redirectUri: redirectUrl.toString(),
      scope,
      state,
      jwt,
    });

    const authUrlObj = new URL(authUrl);
    console.log("revolut-connect auth url", {
      host: authUrlObj.hostname,
      path: authUrlObj.pathname,
      hasClientId: authUrlObj.searchParams.has("client_id"),
      hasRedirectUri: authUrlObj.searchParams.has("redirect_uri"),
      hasRequestJwt: authUrlObj.searchParams.has("request"),
    });

    return new Response(JSON.stringify({ auth_url: authUrl }), {
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
