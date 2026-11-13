// Admin uniquement : crée (une seule fois) le webhook Resend des avis de remise/rejet
// et range sa clé de signature côté serveur. La clé n'est JAMAIS renvoyée ni journalisée.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ENDPOINT = `${Deno.env.get("SUPABASE_URL")}/functions/v1/email-webhook`;
const EVENTS = ["email.delivered", "email.bounced", "email.complained", "email.delivery_delayed"];
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await sb.auth.getUser(jeton);
  if (!u?.user) return json({ error: "connexion requise" }, 401);
  const { data: role } = await sb.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
  const { data: prof } = await sb.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  if (!role && prof?.role !== "admin") return json({ error: "réservé aux administrateurs" }, 403);

  const { data: existant } = await sb.from("resend_webhook_config").select("webhook_id").eq("id", 1).maybeSingle();
  if (existant) return json({ etat: "deja_configure", webhook_id: existant.webhook_id });

  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return json({ error: "clé d'envoi absente" }, 500);
  const h = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  const liste = await fetch("https://api.resend.com/webhooks", { headers: h });
  const listeTxt = await liste.text();
  if (!liste.ok) return json({ error: "lecture des webhooks refusée", status: liste.status, details: listeTxt.slice(0, 300) }, 502);
  const deja = (JSON.parse(listeTxt)?.data ?? []).find((w: { endpoint?: string }) => w.endpoint === ENDPOINT);
  if (deja) return json({ etat: "webhook_existant_sans_cle", webhook_id: deja.id }, 409);

  const cree = await fetch("https://api.resend.com/webhooks", { method: "POST", headers: h, body: JSON.stringify({ endpoint: ENDPOINT, events: EVENTS }) });
  const txt = await cree.text();
  if (!cree.ok) return json({ error: "création refusée par Resend", status: cree.status, details: txt.slice(0, 300) }, 502);
  const d = JSON.parse(txt);
  if (!d?.id || typeof d?.signing_secret !== "string" || !d.signing_secret.startsWith("whsec_")) {
    return json({ error: "réponse Resend sans clé de signature", webhook_id: d?.id ?? null }, 502);
  }
  const { error } = await sb.from("resend_webhook_config").insert({ id: 1, webhook_id: d.id, signing_secret: d.signing_secret, endpoint: ENDPOINT });
  if (error) return json({ error: "enregistrement de la clé impossible", webhook_id: d.id }, 500);
  return json({ etat: "configure", webhook_id: d.id, evenements: EVENTS });
});
