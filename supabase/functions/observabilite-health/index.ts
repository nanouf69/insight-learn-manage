/**
 * LOT 4A — OBSERVABILITÉ UNIQUEMENT (lecture seule).
 *
 * Cette fonction n'écrit JAMAIS dans les données pédagogiques :
 * - contrôles de santé en LECTURE SEULE (aucune écriture TEST en base) ;
 * - journaux persistants écrits dans un stockage fichiers séparé du moteur de
 *   base de données (bucket privé `observabilite-logs`), en ajout seul, plus
 *   un éventuel collecteur externe (LOG_DRAIN_URL) ;
 * - alertes envoyées par un canal totalement indépendant de la base
 *   (API Resend appelée directement, plus ALERT_WEBHOOK_URL si défini).
 *
 * Appelée depuis un service de surveillance EXTERNE avec le jeton
 * MONITORING_TRIGGER_TOKEN.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// Jetons acceptés : jeton interne + jeton partagé remis au service externe.
const TRIGGER_TOKENS = [
  Deno.env.get("MONITORING_TRIGGER_TOKEN") ?? "",
  Deno.env.get("MONITORING_SHARED_TOKEN") ?? "",
].filter((t) => t.length > 0);
const ALERT_EMAIL = Deno.env.get("MONITORING_ALERT_EMAIL") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ALERT_WEBHOOK_URL = Deno.env.get("ALERT_WEBHOOK_URL") ?? "";
const LOG_DRAIN_URL = Deno.env.get("LOG_DRAIN_URL") ?? "";
const LOG_DRAIN_TOKEN = Deno.env.get("LOG_DRAIN_TOKEN") ?? "";
const SITE_URL = Deno.env.get("MONITORING_SITE_URL") ?? "https://gestion.ftransport.fr";

const BUCKET = "observabilite-logs";
const SEUILS = { latenceDegradeeMs: 2000, latenceCritiqueMs: 5000, dedupMs: 5 * 60_000 };

type Etat = "ok" | "degrade" | "ko";
type Sonde = { nom: string; etat: Etat; latenceMs: number; detail?: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sonder(nom: string, fn: () => Promise<{ ok: boolean; detail?: string }>): Promise<Sonde> {
  const t0 = Date.now();
  try {
    const r = await fn();
    const latenceMs = Date.now() - t0;
    const etat: Etat = !r.ok
      ? "ko"
      : latenceMs >= SEUILS.latenceCritiqueMs
        ? "ko"
        : latenceMs >= SEUILS.latenceDegradeeMs
          ? "degrade"
          : "ok";
    return { nom, etat, latenceMs, detail: r.detail };
  } catch (e) {
    return { nom, etat: "ko", latenceMs: Date.now() - t0, detail: String(e) };
  }
}

const timeout = (ms: number) => AbortSignal.timeout(ms);

async function checkFrontend(): Promise<Sonde> {
  return sonder("frontend", async () => {
    const r = await fetch(SITE_URL, { method: "GET", signal: timeout(8000) });
    return { ok: r.ok, detail: `HTTP ${r.status}` };
  });
}

async function checkBackend(): Promise<Sonde> {
  return sonder("backend", async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      signal: timeout(8000),
    });
    return { ok: r.ok, detail: `HTTP ${r.status}` };
  });
}

/** LECTURE SEULE : aucune écriture, aucune donnée pédagogique modifiée. */
async function checkDbLecture(): Promise<Sonde> {
  return sonder("db_lecture", async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/apprenants?select=id&limit=1`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      signal: timeout(8000),
    });
    return { ok: r.ok, detail: `HTTP ${r.status}` };
  });
}

async function checkAuth(): Promise<Sonde> {
  return sonder("auth", async () => {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SERVICE_KEY },
      signal: timeout(8000),
    });
    return { ok: r.ok, detail: `HTTP ${r.status}` };
  });
}

// ---------------------------------------------------------------- journaux
async function ecrireJournal(entree: Record<string, unknown>): Promise<{ fichier: string | null; drain: boolean }> {
  const now = new Date();
  const chemin = `logs/${now.toISOString().slice(0, 10)}/${now.toISOString().replace(/[:.]/g, "-")}-${entree.correlation_id}.json`;
  let fichier: string | null = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${chemin}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        "x-upsert": "false", // ajout seul : jamais d'écrasement
      },
      body: JSON.stringify(entree),
    });
    if (r.ok) fichier = chemin;
  } catch (_) {
    /* le journal ne doit jamais faire échouer la surveillance */
  }
  let drain = false;
  if (LOG_DRAIN_URL) {
    try {
      const r = await fetch(LOG_DRAIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(LOG_DRAIN_TOKEN ? { Authorization: `Bearer ${LOG_DRAIN_TOKEN}` } : {}),
        },
        body: JSON.stringify(entree),
        signal: timeout(5000),
      });
      drain = r.ok;
    } catch (_) {
      drain = false;
    }
  }
  return { fichier, drain };
}

// ------------------------------------------------- état de déduplication
type EtatAlertes = Record<string, { actif: boolean; dernierEnvoiAt: number; occurrences: number }>;
const CHEMIN_ETAT = "state/alert-state.json";

async function lireEtat(): Promise<EtatAlertes> {
  try {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${CHEMIN_ETAT}`, {
      headers: { Authorization: `Bearer ${SERVICE_KEY}` },
      signal: timeout(5000),
    });
    if (!r.ok) return {};
    return (await r.json()) as EtatAlertes;
  } catch (_) {
    return {};
  }
}

async function ecrireEtat(etat: EtatAlertes): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${CHEMIN_ETAT}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", "x-upsert": "true" },
      body: JSON.stringify(etat),
      signal: timeout(5000),
    });
  } catch (_) {
    /* non bloquant */
  }
}

// ------------------------------------------------------------- alertes
async function envoyerAlerte(
  code: string,
  gravite: "critique" | "avertissement" | "retablissement",
  message: string,
  correlationId: string,
): Promise<{ canauxOk: string[]; canauxEchoues: string[] }> {
  const canauxOk: string[] = [];
  const canauxEchoues: string[] = [];
  const titre = `[FTRANSPORT ${gravite.toUpperCase()}] ${code}`;
  const corps = `<p><strong>${message}</strong></p><p>Code : ${code}<br>Gravité : ${gravite}<br>Heure : ${new Date().toISOString()}<br>Correlation ID : ${correlationId}</p>`;

  // Canal 1 : webhook externe (aucune dépendance à la base) — si configuré.
  if (ALERT_WEBHOOK_URL) {
    try {
      const r = await fetch(ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, gravite, message, correlation_id: correlationId, at: new Date().toISOString() }),
        signal: timeout(6000),
      });
      r.ok ? canauxOk.push("webhook") : canauxEchoues.push("webhook");
    } catch (_) {
      canauxEchoues.push("webhook");
    }
  }

  // Canal 2 : e-mail technique via Resend (API externe, indépendante de la base).
  if (RESEND_API_KEY && ALERT_EMAIL) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "FTRANSPORT Supervision <contact@ftransport.fr>",
          to: [ALERT_EMAIL],
          subject: titre,
          html: corps,
        }),
        signal: timeout(10000),
      });
      r.ok ? canauxOk.push("email") : canauxEchoues.push(`email(${r.status})`);
    } catch (e) {
      canauxEchoues.push(`email(${String(e)})`);
    }
  }
  return { canauxOk, canauxEchoues };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const token = req.headers.get("x-monitoring-token") ?? url.searchParams.get("token") ?? "";
  if (!TRIGGER_TOKEN || token !== TRIGGER_TOKEN) {
    return json({ error: "unauthorized" }, 401);
  }

  const correlationId = req.headers.get("x-correlation-id") ?? crypto.randomUUID();
  const mode = url.searchParams.get("mode") ?? "health";
  const debut = Date.now();

  // Modes de test explicites (aucun impact sur les examens).
  if (mode === "test-alert" || mode === "test-recovery") {
    const gravite = mode === "test-alert" ? "critique" : "retablissement";
    const res = await envoyerAlerte(
      mode === "test-alert" ? "TEST_ALERTE_EXTERNE" : "TEST_ALERTE_EXTERNE_RETABLI",
      gravite as "critique" | "retablissement",
      mode === "test-alert"
        ? "TEST — vérification du canal d'alerte externe (aucune panne réelle)."
        : "TEST — rétablissement simulé du canal d'alerte externe.",
      correlationId,
    );
    const journal = await ecrireJournal({
      correlation_id: correlationId,
      at: new Date().toISOString(),
      categorie: "alerte",
      mode,
      canaux_ok: res.canauxOk,
      canaux_echoues: res.canauxEchoues,
    });
    return json({ mode, correlation_id: correlationId, alerte: res, journal });
  }

  const [frontend, backend, dbLecture, auth] = await Promise.all([
    checkFrontend(),
    checkBackend(),
    checkDbLecture(),
    checkAuth(),
  ]);
  const sondes = [frontend, backend, dbLecture, auth];
  const pire: Etat = sondes.some((s) => s.etat === "ko") ? "ko" : sondes.some((s) => s.etat === "degrade") ? "degrade" : "ok";

  // Alertes avec déduplication + rétablissement (état hors moteur de base).
  const etat = await lireEtat();
  const now = Date.now();
  const alertes: unknown[] = [];
  for (const s of sondes) {
    const code = `${s.nom.toUpperCase()}_INDISPONIBLE`;
    const e = etat[code] ?? { actif: false, dernierEnvoiAt: 0, occurrences: 0 };
    if (s.etat === "ko") {
      e.occurrences += 1;
      e.actif = true;
      if (now - e.dernierEnvoiAt >= SEUILS.dedupMs) {
        const r = await envoyerAlerte(code, "critique", `${s.nom} indisponible (${s.detail ?? "sans détail"})`, correlationId);
        if (r.canauxOk.length > 0) e.dernierEnvoiAt = now;
        alertes.push({ code, envoi: r });
      } else {
        alertes.push({ code, regroupee: true, occurrences: e.occurrences });
      }
    } else if (e.actif) {
      e.actif = false;
      e.occurrences = 0;
      e.dernierEnvoiAt = 0;
      const r = await envoyerAlerte(`${code}_RETABLI`, "retablissement", `${s.nom} de nouveau disponible`, correlationId);
      alertes.push({ code: `${code}_RETABLI`, envoi: r });
    }
    etat[code] = e;
  }
  await ecrireEtat(etat);

  const entree = {
    correlation_id: correlationId,
    at: new Date().toISOString(),
    categorie: "health_check",
    verdict: pire,
    duree_totale_ms: Date.now() - debut,
    sondes,
    alertes,
  };
  const journal = await ecrireJournal(entree);

  return json({ ...entree, journal }, pire === "ko" ? 503 : 200);
});
