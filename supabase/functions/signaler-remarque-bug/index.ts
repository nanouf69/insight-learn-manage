import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendBrandedEmail } from "../_shared/send-branded-email.ts";

const BUCKET = "signalements-apprenants";
const MAX_IMAGE = 20 * 1024 * 1024;
const MAX_IMAGES = 10;
// Au-delà, les captures sont transmises par liens privés (limite fournisseur ~40 Mo encodé).
const MAX_PJ_TOTAL = 25 * 1024 * 1024;
const DESTINATAIRE = "contact@ftransport.fr";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function toBase64(buf: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + 0x8000)) as any);
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Méthode non autorisée." });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json(401, { error: "Session expirée : reconnectez-vous." });
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !u?.user) return json(401, { error: "Session expirée : reconnectez-vous." });
    const uid = u.user.id;

    const body = await req.json().catch(() => null);
    const type = body?.type;
    const explication = typeof body?.explication === "string" ? body.explication.trim() : "";
    const chemins: unknown = body?.chemins ?? [];
    if (type !== "bug" && type !== "remarque") return json(400, { error: "Type de signalement invalide." });
    if (explication.length < 1) return json(400, { error: "L'explication est obligatoire." });
    if (explication.length > 5000) return json(400, { error: "L'explication dépasse 5000 caractères." });
    if (!Array.isArray(chemins) || chemins.length > MAX_IMAGES || chemins.some((c) => typeof c !== "string")) {
      return json(400, { error: `Captures invalides (maximum ${MAX_IMAGES}).` });
    }
    if (type === "bug" && chemins.length === 0) return json(400, { error: "Au moins une capture d'écran est obligatoire pour un bug." });

    const { data: app } = await admin.from("apprenants").select("id, nom, prenom, email").eq("auth_user_id", uid).limit(1).maybeSingle();
    if (!app) return json(403, { error: "Compte apprenant introuvable." });

    const images: { nom: string; mime: string; octets: Uint8Array; lien: string }[] = [];
    for (const c of chemins as string[]) {
      if (!c.startsWith(`${uid}/`) || c.includes("..")) return json(403, { error: "Capture non autorisée." });
      const { data: blob, error } = await admin.storage.from(BUCKET).download(c);
      if (error || !blob) return json(400, { error: "Une capture est introuvable : renvoyez-la." });
      const mime = (blob.type || "").toLowerCase();
      if (!mime.startsWith("image/")) return json(400, { error: "Seules les images sont acceptées." });
      if (blob.size > MAX_IMAGE) return json(400, { error: "Une capture dépasse 20 Mo." });
      const { data: signe } = await admin.storage.from(BUCKET).createSignedUrl(c, 60 * 60 * 24 * 7);
      images.push({ nom: c.split("/").pop() ?? "capture", mime, octets: new Uint8Array(await blob.arrayBuffer()), lien: signe?.signedUrl ?? "" });
    }
    const total = images.reduce((s, i) => s + i.octets.length, 0);
    const joindre = total <= MAX_PJ_TOTAL;

    const libelle = type === "bug" ? "Bug informatique" : "Remarque";
    const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "medium", timeZone: "Europe/Paris" }).format(new Date());
    const nom = `${app.prenom ?? ""} ${app.nom ?? ""}`.trim() || "(nom non renseigné)";
    const liens = images.map((i, n) => `<li><a href="${esc(i.lien)}">Capture ${n + 1} (${esc(i.nom)})</a></li>`).join("");
    const html = `<div style="font-family:Arial,sans-serif;max-width:640px">
<h2>Signalement apprenant : ${esc(libelle)}</h2>
<p><strong>Type :</strong> ${esc(libelle)}<br/><strong>Apprenant :</strong> ${esc(nom)}${app.email ? ` (${esc(app.email)})` : ""}<br/><strong>Date :</strong> ${esc(date)}</p>
<p><strong>Explication :</strong></p><p style="white-space:pre-wrap">${esc(explication)}</p>
${images.length ? `<p><strong>Captures (${images.length})</strong> ${joindre ? "jointes à ce mail ; " : "trop volumineuses pour être jointes ; "}liens privés valables 7 jours :</p><ul>${liens}</ul>` : "<p>Aucune capture.</p>"}
</div>`;

    await sendBrandedEmail({
      to: DESTINATAIRE,
      subject: `[${libelle}] ${nom}`,
      html,
      replyTo: app.email ?? undefined,
      attachments: joindre ? images.map((i) => ({ name: i.nom, contentType: i.mime, contentBytes: toBase64(i.octets) })) : [],
    });
    return json(200, { ok: true, joint: joindre });
  } catch (e) {
    console.error("[signaler-remarque-bug]", e);
    return json(502, { error: "L'envoi du mail a échoué. Votre signalement n'a pas été transmis, réessayez plus tard." });
  }
});
