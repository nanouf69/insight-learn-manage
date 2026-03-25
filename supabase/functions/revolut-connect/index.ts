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

    const privateKey = `-----BEGIN PRIVATE KEY-----
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
aETQGS5qfg+yPkLW2eTDOWdH1WKBZw==
-----END PRIVATE KEY-----`;

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
