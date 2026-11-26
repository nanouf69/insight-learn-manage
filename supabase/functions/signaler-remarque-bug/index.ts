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
    // Trace privée conservée AVANT l'envoi (registre interne, jamais visible de l'apprenant).
    const captures = (chemins as string[]).map((c, n) => ({ bucket: BUCKET, chemin: c, mime: images[n].mime, octets: images[n].octets.length }));
    const { data: trace, error: tErr } = await admin.from("signalements_apprenants").insert({
      apprenant_id: app.id, auth_user_id: uid, type, apprenant_nom: nom, apprenant_email: app.email ?? null,
      explication, captures, pieces_jointes: joindre,
    }).select("id, created_at, reference").single();
    if (tErr || !trace) { console.error("[signaler-remarque-bug] trace", tErr); return json(500, { error: "Le signalement n'a pas pu être enregistré. Réessayez plus tard." }); }

    const html = `<div style="font-family:Arial,sans-serif;max-width:640px">
<h2>Ticket ${esc(trace.reference)} : ${esc(libelle)}</h2>
<p><strong>Référence :</strong> ${esc(trace.reference)}<br/><strong>Statut :</strong> Reçu<br/><strong>Type :</strong> ${esc(libelle)}<br/><strong>Apprenant :</strong> ${esc(nom)}${app.email ? ` (${esc(app.email)})` : ""}<br/><strong>Date :</strong> ${esc(date)}</p>
<p><strong>Explication :</strong></p><p style="white-space:pre-wrap">${esc(explication)}</p>
${images.length ? `<p><strong>Captures (${images.length})</strong> ${joindre ? "jointes à ce mail ; " : "trop volumineuses pour être jointes ; "}liens privés valables 7 jours :</p><ul>${liens}</ul>` : "<p>Aucune capture.</p>"}
</div>`;

    await admin.from("signalements_suivi").insert({ signalement_id: trace.id, nature: "creation", statut_apres: "recu", visible_apprenant: true, contenu: "Ticket reçu.", auteur_nom: "Système" });

    // Rattachement interne au registre Qualiopi existant : indicateur 32, reçu NON analysé.
    try {
      const { data: preuve } = await admin.from("qualiopi_preuves").insert({
        titre: `Ticket ${trace.reference} (${libelle}) – ${nom}`,
        description: explication.slice(0, 500),
        date_preuve: String(trace.created_at).slice(0, 10),
        source_type: "signalement_apprenant", source_table: "signalements_apprenants", source_id: trace.id,
        source_libelle: "Onglet « Signaler une remarque ou un bug » (espace apprenant)",
        ce_que_demontre: "Réception d'une appréciation/réclamation. Reçu non analysé : ne démontre pas à lui seul l'indicateur 32 (analyse, mesure d'amélioration et suivi restent à formaliser).",
        emplacement: `signalements_apprenants/${trace.id}`,
        remarque_interne: "Statut : reçu, non vérifié, non analysé.",
        ref_key: `signalement:${trace.id}`,
      }).select("id").single();
      if (preuve) {
        await admin.from("qualiopi_preuve_liens").insert({ preuve_id: preuve.id, indicateur: 32, justification: "Qualiopi — indicateur 32 : signalement apprenant reçu, à analyser." });
        await admin.from("signalements_apprenants").update({ qualiopi_preuve_id: preuve.id }).eq("id", trace.id);
      }
    } catch (e) { console.error("[signaler-remarque-bug] qualiopi", e); }

    try {
      await sendBrandedEmail({
      to: DESTINATAIRE,
      subject: `[${trace.reference}] ${libelle} – ${nom}`,
      html,
      replyTo: app.email ?? undefined,
      attachments: joindre ? images.map((i) => ({ name: i.nom, contentType: i.mime, contentBytes: toBase64(i.octets) })) : [],
      });
    } catch (e) {
      await admin.from("signalements_apprenants").update({ envoi_statut: "echec", envoi_erreur: String((e as Error)?.message ?? e).slice(0, 500), envoi_le: new Date().toISOString() }).eq("id", trace.id);
      console.error("[signaler-remarque-bug] mail", e);
      return json(502, { error: `Votre ticket ${trace.reference} est enregistré, mais le mail au centre n'a pas pu partir. Le centre le verra dans son registre.`, reference: trace.reference, envoi: "echec" });
    }
    await admin.from("signalements_apprenants").update({ envoi_statut: "envoye", envoi_le: new Date().toISOString() }).eq("id", trace.id);
    return json(200, { ok: true, joint: joindre, reference: trace.reference, envoi: "envoye" });
  } catch (e) {
    console.error("[signaler-remarque-bug]", e);
    return json(502, { error: "L'envoi du mail a échoué. Votre signalement n'a pas été transmis, réessayez plus tard." });
  }
});
