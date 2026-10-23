import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendBrandedEmail } from "../_shared/send-branded-email.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://gestion.ftransport.fr";
const FROM = "contact@ftransport.fr";

// Envoi UNITAIRE du mail de régularisation d'émargements.
// Garde-fous : appelable uniquement avec la clé service, une seule fois par
// autorisation (idempotence via l'historique emails), destinataire = l'apprenant
// de l'autorisation, jamais de liste.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const auth = req.headers.get("Authorization") ?? "";
    if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { regularisation_id } = await req.json();
    if (!regularisation_id) {
      return new Response(JSON.stringify({ error: "regularisation_id requis" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);

    const { data: reg, error: regErr } = await supabase
      .from("emargement_regularisations")
      .select("id, apprenant_id, creneaux, expire_le")
      .eq("id", regularisation_id)
      .maybeSingle();
    if (regErr || !reg) {
      return new Response(JSON.stringify({ error: "Autorisation introuvable" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: a, error: aErr } = await supabase
      .from("apprenants")
      .select("id, prenom, nom, email")
      .eq("id", reg.apprenant_id)
      .maybeSingle();
    if (aErr || !a?.email) {
      return new Response(JSON.stringify({ error: "Apprenant sans email" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Idempotence : un seul mail par autorisation.
    const { data: deja } = await supabase
      .from("emails")
      .select("id")
      .eq("apprenant_id", a.id)
      .ilike("body_preview", `%regularisation:${reg.id}%`)
      .limit(1);
    if (deja && deja.length > 0) {
      return new Response(JSON.stringify({ error: "Mail déjà envoyé pour cette autorisation", email_id: deja[0].id }), { status: 409, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const lien = `${SITE}/emargements-regularisation/${reg.id}`;
    const creneaux = (reg.creneaux as { date: string; creneau: string }[]) || [];
    const parJour = new Map<string, string[]>();
    for (const c of creneaux) {
      const l = parJour.get(c.date) ?? [];
      l.push(c.creneau === "matin" ? "matin" : "après-midi");
      parJour.set(c.date, l);
    }
    const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const lignes = [...parJour.entries()]
      .sort(([d1], [d2]) => d1.localeCompare(d2))
      .map(([d, c]) => `<li style="margin:4px 0"><strong style="text-transform:capitalize">${fmt(d)}</strong> — ${c.join(" et ")}</li>`)
      .join("");
    const expire = new Date(reg.expire_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

    const subject = "Signatures manquantes — vos émargements de septembre";
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a">
  <p>Bonjour ${a.prenom},</p>
  <p>Il nous manque vos signatures de présence pour les journées suivantes de votre formation de septembre 2026 :</p>
  <ul style="color:#b91c1c">${lignes}</ul>
  <p><strong>Ne signez que les créneaux auxquels vous étiez réellement présent.</strong> Si vous n'étiez pas présent à une journée, ne la signez pas.</p>
  <p>Pour signer, cliquez sur le bouton ci-dessous. Vous devrez être connecté avec votre compte. Pour chaque créneau, vous cocherez vous-même la confirmation de présence avant de signer.</p>
  <p style="text-align:center;margin:28px 0">
    <a href="${lien}" style="background:#1d4ed8;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Signer mes émargements</a>
  </p>
  <p style="font-size:13px;color:#555">Ce lien personnel est valable jusqu'au ${expire}. Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br/><a href="${lien}">${lien}</a></p>
  <p>Cordialement,<br/><strong>L'équipe FTRANSPORT</strong></p>
</div>`;

    const trackingId = await sendBrandedEmail({ to: a.email, subject, html, replyTo: FROM });
    const { data: inserted, error: insErr } = await supabase.from("emails").insert({
      apprenant_id: a.id,
      subject,
      body_html: html,
      body_preview: `Régularisation émargements 22–25/09/2026 (regularisation:${reg.id})`,
      sender_email: FROM,
      sender_name: "FTRANSPORT",
      recipients: [a.email],
      type: "sent",
      sent_at: new Date().toISOString(),
    }).select("id").single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, email_id: inserted.id, tracking_id: trackingId, to: a.email }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Erreur inconnue" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
