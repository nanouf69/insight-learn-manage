// Lien public « Je confirme avoir reçu cet e-mail ».
// GET = page avec bouton (aucune écriture : les antivirus/aperçus qui ouvrent
// les liens ne confirment jamais). POST = confirmation unique, horodatage serveur.
import { createClient } from "npm:@supabase/supabase-js@2";
import { deciderConfirmation, hacherJeton, masquerEmail } from "../_shared/confirmationReception.ts";

const page = (corps: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Accusé de réception</title></head><body style="font-family:Arial,sans-serif;max-width:520px;margin:40px auto;padding:0 16px;font-size:17px;line-height:1.5">${corps}<p style="font-size:12px;color:#666;margin-top:32px">FTRANSPORT — seule la date de confirmation est enregistrée.</p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
  );

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  let jeton = url.searchParams.get("t") ?? "";
  if (req.method === "POST") {
    const f = await req.formData().catch(() => null);
    jeton = String(f?.get("t") ?? jeton);
  }
  if (!/^[0-9a-f]{64}$/.test(jeton)) return page("<h1>Lien invalide</h1>", 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const hash = await hacherJeton(jeton);
  const { data: ligne, error } = await sb
    .from("email_confirmations_reception")
    .select("id, expires_at, confirmed_at, email_accuses(destinataire, sujet)")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error) return page("<h1>Service momentanément indisponible</h1><p>Réessayez plus tard.</p>", 503);

  const d = deciderConfirmation(ligne);
  const fmt = (v: string) => new Date(v).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  if (d.action === "introuvable") return page("<h1>Lien invalide</h1>", 404);
  if (d.action === "expire") return page("<h1>Lien expiré</h1><p>Contactez FTRANSPORT si besoin.</p>", 410);
  if (d.action === "deja_confirme") return page(`<h1>Déjà confirmé</h1><p>Réception confirmée le ${fmt(d.date)}.</p>`);

  // deno-lint-ignore no-explicit-any
  const acc = (ligne as any).email_accuses ?? {};
  if (req.method !== "POST") {
    return page(`<h1>Accusé de réception</h1><p>E-mail « ${esc(acc.sujet ?? "")} » adressé à <b>${esc(masquerEmail(acc.destinataire ?? ""))}</b>.</p>
<form method="post"><input type="hidden" name="t" value="${jeton}"><button style="font-size:18px;padding:14px 20px;width:100%;cursor:pointer">Je confirme avoir reçu cet e-mail</button></form>
<p style="font-size:13px">Si cette adresse n'est pas la vôtre, ne cliquez pas.</p>`);
  }

  // Écriture conditionnelle : ne touche que si encore non confirmé et non expiré.
  const { data: maj, error: e2 } = await sb
    .from("email_confirmations_reception")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", (ligne as { id: string }).id)
    .is("confirmed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("confirmed_at")
    .maybeSingle();
  if (e2) return page("<h1>Service momentanément indisponible</h1>", 503);
  if (!maj) return page("<h1>Déjà confirmé ou expiré</h1>");
  return page(`<h1>Merci</h1><p>Réception confirmée le ${fmt(maj.confirmed_at)}.</p>`);
});
