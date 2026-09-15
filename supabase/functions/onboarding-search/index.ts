import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS_PER_WINDOW = 30;
const TOKEN_TTL_SECONDS = 20 * 60;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const enc = new TextEncoder();

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(value: string) {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "fallback";
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Jeton limité : valable uniquement pour CE dossier, pendant 20 minutes,
// et uniquement pour l'opération d'inscription.
async function issueToken(apprenantId: string) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = `onboarding:${apprenantId}:${exp}`;
  return `${exp}.${await hmac(payload)}`;
}

async function verifyToken(apprenantId: string, token: string) {
  const [expRaw, sig] = String(token || "").split(".");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || !sig) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(`onboarding:${apprenantId}:${exp}`);
  return expected === sig;
}

function maskEmail(email?: string | null) {
  if (!email) return null;
  const [user, domain] = email.split("@");
  if (!domain) return null;
  const head = user.slice(0, 1);
  const tail = user.length > 2 ? user.slice(-1) : "";
  return `${head}${"•".repeat(Math.max(2, user.length - 2))}${tail}@${domain}`;
}

function maskPhone(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `••••••${digits.slice(-2)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "search";
    const nom = typeof body?.nom === "string" ? body.nom.trim().slice(0, 100) : "";
    const prenom = typeof body?.prenom === "string" ? body.prenom.trim().slice(0, 100) : "";

    if (nom.length < 2 || prenom.length < 2) {
      return json({ error: "Nom et prénom requis" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---- limitation des tentatives par visiteur ----
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || "unknown";
    const ipHash = await sha256Hex(ip);
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

    const { count: recentAttempts } = await supabase
      .from("onboarding_search_rate_limit")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", windowStart);

    if ((recentAttempts ?? 0) >= MAX_ATTEMPTS_PER_WINDOW) {
      return json(
        { error: "Trop de recherches en peu de temps. Merci de patienter quelques minutes ou d'appeler le centre au 04 28 29 60 91." },
        429,
      );
    }

    await supabase.from("onboarding_search_rate_limit").insert({ ip_hash: ipHash });

    // ---- recherche (exécutée côté serveur uniquement) ----
    const { data: results, error } = await supabase.rpc("search_apprenant_onboarding", {
      p_nom: nom,
      p_prenom: prenom,
    });

    if (error) {
      console.error("search_apprenant_onboarding error", error);
      return json({ error: "Recherche indisponible" }, 500);
    }

    const rows = (results || []) as Array<Record<string, string | null>>;

    if (action === "select") {
      const apprenantId = typeof body?.apprenant_id === "string" ? body.apprenant_id : "";
      const token = typeof body?.token === "string" ? body.token : "";

      if (!apprenantId || !(await verifyToken(apprenantId, token))) {
        return json({ error: "Session d'inscription expirée. Relancez la recherche." }, 403);
      }

      // Le dossier doit toujours faire partie des résultats de cette recherche.
      const match = rows.find((r) => r.id === apprenantId);
      if (!match) return json({ error: "Dossier introuvable" }, 404);

      const { data: extra } = await supabase
        .from("apprenants")
        .select("type_apprenant, formation_choisie")
        .eq("id", apprenantId)
        .maybeSingle();

      const blob = `${extra?.type_apprenant || ""} ${extra?.formation_choisie || ""}`.toLowerCase();
      const isFC = /continu|\bfc\b|formation\s*continue/.test(blob);

      // Jeton de session du parcours (12 h) : permet la reprise du dossier déjà enregistré.
      const sessionExp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
      const sessionToken = `${sessionExp}.${await hmac(`onboarding:${apprenantId}:${sessionExp}`)}`;

      return json({
        session_token: sessionToken,
        dossier: {
          id: match.id,
          nom: match.nom,
          prenom: match.prenom,
          email: match.email,
          telephone: match.telephone,
          adresse: match.adresse,
          code_postal: match.code_postal,
          ville: match.ville,
        },
        is_fc: isFC,
      });
    }

    // action = search : réponse minimale (aucune coordonnée en clair)
    const candidates = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        nom: r.nom,
        prenom: r.prenom,
        email_masque: maskEmail(r.email),
        telephone_masque: maskPhone(r.telephone),
        ville: r.ville,
        token: await issueToken(String(r.id)),
      })),
    );

    return json({ candidates });
  } catch (err) {
    console.error("onboarding-search", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
