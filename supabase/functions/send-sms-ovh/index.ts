import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// G1 (23/09/2026) : service SMS réservé aux administrateurs et aux automatismes serveur.
const OVH_API_URL = "https://eu.api.ovh.com/1.0";
const SENDER = "FTRANSPORT";
const MAX_RECEIVERS = 100;
const MAX_CHARS = 480;
const LIMIT_ADMIN_PER_HOUR = 500;
const LIMIT_GLOBAL_PER_DAY = 1000;
const LIMIT_PER_NUMBER_PER_DAY = 3;

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha1Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function ovhSign(appSecret: string, consumerKey: string, method: string, url: string, body: string, ts: number) {
  return "$1$" + (await sha1Hex([appSecret, consumerKey, method, url, body, String(ts)].join("+")));
}

function normalizeFrMobile(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let c = raw.replace(/[\s.\-()]/g, "");
  if (c.startsWith("0033")) c = "+33" + c.slice(4);
  else if (c.startsWith("33") && c.length === 11) c = "+" + c;
  else if (c.startsWith("0")) c = "+33" + c.slice(1);
  return /^\+33[67]\d{8}$/.test(c) ? c : null;
}
const mask = (p: string) => `+33 ${p[3]} •• •• •• ${p.slice(-2)}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Méthode non autorisée" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  const log = (row: Record<string, unknown>) =>
    admin.from("sms_envois").insert(row).then(({ error }) => { if (error) console.error("journal SMS:", error.message); });

  // 1. Identification
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  let declencheur: { type: "automatique" | "admin"; userId: string | null; email: string | null } | null = null;

  if (token && token === serviceKey) {
    declencheur = { type: "automatique", userId: null, email: null };
  } else if (token) {
    const { data: u } = await admin.auth.getUser(token);
    if (u?.user) {
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (isAdmin !== true) {
        await log({ declencheur_type: "refuse", declencheur_user_id: u.user.id, declencheur_email: u.user.email, resultat: "refuse_role" });
        return json(403, { success: false, error: "Accès refusé" });
      }
      declencheur = { type: "admin", userId: u.user.id, email: u.user.email ?? null };
    }
  }
  if (!declencheur) {
    await log({ declencheur_type: "anonyme", resultat: "refuse_auth" });
    return json(401, { success: false, error: "Authentification requise" });
  }
  const base = { declencheur_type: declencheur.type, declencheur_user_id: declencheur.userId, declencheur_email: declencheur.email };

  const appKey = Deno.env.get("OVH_APP_KEY");
  const appSecret = Deno.env.get("OVH_APP_SECRET");
  const consumerKey = Deno.env.get("OVH_CONSUMER_KEY");
  const serviceName = Deno.env.get("OVH_SMS_SERVICE_NAME");
  if (!appKey || !appSecret || !consumerKey || !serviceName) return json(500, { success: false, error: "Service SMS non configuré" });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { success: false, error: "Corps invalide" }); }

  // Liste des expéditeurs : admin uniquement (automatisme exclu)
  if (body?.action === "list_senders") {
    if (declencheur.type !== "admin") return json(403, { success: false, error: "Accès refusé" });
    const ts = await (await fetch(`${OVH_API_URL}/auth/time`)).json();
    const sUrl = `${OVH_API_URL}/sms/${serviceName}/senders`;
    const res = await fetch(sUrl, { headers: { "X-Ovh-Application": appKey, "X-Ovh-Timestamp": String(ts), "X-Ovh-Signature": await ovhSign(appSecret, consumerKey, "GET", sUrl, "", ts), "X-Ovh-Consumer": consumerKey } });
    await log({ ...base, type_sms: "list_senders", resultat: res.ok ? "consultation" : "erreur_ovh" });
    return json(res.ok ? 200 : 502, { senders: await res.json() });
  }

  // 2. Validation
  const typeSms = typeof body?.type === "string" ? body.type.slice(0, 60) : (declencheur.type === "automatique" ? "automatique" : "admin_manuel");
  const receiversIn = body?.receivers;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const refuse = async (detail: string) => {
    await log({ ...base, type_sms: typeSms, resultat: "refuse_validation", detail, nb_caracteres: message.length });
    return json(400, { success: false, error: detail });
  };
  if (!Array.isArray(receiversIn) || receiversIn.length === 0) return refuse("Destinataires requis");
  if (receiversIn.length > MAX_RECEIVERS) return refuse(`Maximum ${MAX_RECEIVERS} destinataires`);
  if (!message) return refuse("Message requis");
  if (message.length > MAX_CHARS) return refuse(`Maximum ${MAX_CHARS} caractères`);
  const normalized = receiversIn.map(normalizeFrMobile);
  if (normalized.some((n) => !n)) return refuse("Numéro invalide : mobiles français uniquement");
  const receivers = [...new Set(normalized as string[])];

  // 3. Limites
  const now = Date.now();
  const hourAgo = new Date(now - 3600_000).toISOString();
  const dayAgo = new Date(now - 86400_000).toISOString();
  const quota = async (detail: string) => {
    await log({ ...base, type_sms: typeSms, resultat: "refuse_quota", detail, nb_destinataires: receivers.length });
    return json(429, { success: false, error: detail });
  };
  const { data: glob } = await admin.from("sms_envois").select("nb_destinataires").eq("resultat", "envoye").gte("created_at", dayAgo);
  const globalCount = (glob ?? []).reduce((s, r: any) => s + (r.nb_destinataires || 0), 0);
  if (globalCount + receivers.length > LIMIT_GLOBAL_PER_DAY) return quota(`Limite plateforme atteinte (${LIMIT_GLOBAL_PER_DAY}/jour)`);
  if (declencheur.type === "admin") {
    const { data: mine } = await admin.from("sms_envois").select("nb_destinataires").eq("resultat", "envoye").eq("declencheur_user_id", declencheur.userId).gte("created_at", hourAgo);
    const mineCount = (mine ?? []).reduce((s, r: any) => s + (r.nb_destinataires || 0), 0);
    if (mineCount + receivers.length > LIMIT_ADMIN_PER_HOUR) return quota(`Limite administrateur atteinte (${LIMIT_ADMIN_PER_HOUR}/heure)`);
  }
  const hashes = await Promise.all(receivers.map(sha256Hex));
  const { data: perNum } = await admin.from("sms_envois").select("destinataire_hash").eq("resultat", "envoye").in("destinataire_hash", hashes).gte("created_at", dayAgo);
  const counts = new Map<string, number>();
  (perNum ?? []).forEach((r: any) => counts.set(r.destinataire_hash, (counts.get(r.destinataire_hash) ?? 0) + 1));
  const allowed: string[] = [];
  const blocked: string[] = [];
  receivers.forEach((p, i) => ((counts.get(hashes[i]) ?? 0) >= LIMIT_PER_NUMBER_PER_DAY ? blocked : allowed).push(p));
  for (const p of blocked) {
    await log({ ...base, type_sms: typeSms, destinataire_masque: mask(p), destinataire_hash: await sha256Hex(p), nb_destinataires: 1, resultat: "refuse_quota", detail: `Limite ${LIMIT_PER_NUMBER_PER_DAY}/jour par numéro` });
  }
  if (allowed.length === 0) return json(429, { success: false, error: `Limite ${LIMIT_PER_NUMBER_PER_DAY} SMS/jour par numéro atteinte` });

  // 4. Envoi (expéditeur imposé)
  const ts = await (await fetch(`${OVH_API_URL}/auth/time`)).json();
  const smsUrl = `${OVH_API_URL}/sms/${serviceName}/jobs`;
  const smsBody = JSON.stringify({
    charset: "UTF-8", class: "phoneDisplay", coding: "7bit", message, noStopClause: true, priority: "high",
    receivers: allowed, validityPeriod: 2880, sender: SENDER, senderForResponse: false,
  });
  const smsRes = await fetch(smsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Ovh-Application": appKey, "X-Ovh-Timestamp": String(ts), "X-Ovh-Signature": await ovhSign(appSecret, consumerKey, "POST", smsUrl, smsBody, ts), "X-Ovh-Consumer": consumerKey },
    body: smsBody,
  });
  const result = await smsRes.json().catch(() => ({}));
  for (const p of allowed) {
    await log({ ...base, type_sms: typeSms, destinataire_masque: mask(p), destinataire_hash: await sha256Hex(p), nb_destinataires: 1, nb_caracteres: message.length, resultat: smsRes.ok ? "envoye" : "erreur_ovh", detail: smsRes.ok ? null : `[${smsRes.status}]`, ovh_ids: smsRes.ok ? result.ids ?? null : null });
  }
  if (!smsRes.ok) {
    console.error(`OVH SMS error [${smsRes.status}]:`, JSON.stringify(result));
    return json(502, { success: false, error: `Erreur OVH [${smsRes.status}]` });
  }
  return json(200, { success: true, totalCreditsRemoved: result.totalCreditsRemoved, validReceivers: result.validReceivers, invalidReceivers: result.invalidReceivers, ids: result.ids, blockedByQuota: blocked.length });
});
