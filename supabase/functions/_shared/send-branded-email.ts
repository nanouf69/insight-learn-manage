export interface BrandedEmailAttachment {
  name: string;
  contentType: string;
  contentBytes: string;
}

interface BrandedEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: BrandedEmailAttachment[];
}

const FROM_ADDRESS = "FTRANSPORT <contact@ftransport.fr>";

import { estEmailValide } from "./email-valide.ts";
import { appliquerSignatureEmail } from "./signatureEmail.ts";
export { estEmailValide };

/**
 * Single outbound transport for FTRANSPORT emails.
 * Using the branded sender here prevents the Microsoft mailbox profile name
 * from replacing FTRANSPORT with a personal display name.
 */
export async function sendBrandedEmail({
  to,
  subject,
  html,
  replyTo,
  attachments = [],
}: BrandedEmailParams): Promise<string | null> {
  // Adresse invalide (ex. « rrt ») : envoi ignoré AVANT le fournisseur, avec motif explicite.
  // La fiche n'est ni modifiée ni supprimée.
  if (!estEmailValide(to)) {
    console.warn(`[email-invalide] Envoi ignoré : adresse invalide « ${String(to ?? "").slice(0, 80)} »`);
    throw new Error(`ADRESSE_INVALIDE : envoi ignoré, adresse « ${String(to ?? "").slice(0, 80)} » invalide`);
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const restHeaders = {
    apikey: serviceKey ?? "",
    Authorization: `Bearer ${serviceKey ?? ""}`,
    "Content-Type": "application/json",
  };

  // Blocage global : apprenants marqués "ne plus recevoir d'emails"
  let apprenantId: string | null = null;
  try {
    if (supabaseUrl && serviceKey && to) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/apprenants?select=id,emails_bloques&email=ilike.${encodeURIComponent(to.trim())}&limit=1`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          apprenantId = rows[0].id ?? null;
          if (rows[0].emails_bloques === true) {
            console.log(`[email-bloque] Envoi annulé vers ${to}`);
            return null;
          }
        }
      }
    }
  } catch (blockErr) {
    console.warn("[email-bloque] vérification impossible (non bloquant):", blockErr);
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("Service d'envoi email non configuré");

  // Accusé de réception : création de la ligne de suivi + pixel d'ouverture
  const trackingId = crypto.randomUUID();
  let trackingEnabled = false;
  if (supabaseUrl && serviceKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/email_accuses`, {
        method: "POST",
        headers: { ...restHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({
          id: trackingId,
          apprenant_id: apprenantId,
          destinataire: to,
          sujet: subject,
          statut: "envoye",
        }),
      });
      trackingEnabled = res.ok;
      if (!res.ok) console.warn("[accuse-reception] création impossible:", await res.text());
    } catch (trackErr) {
      console.warn("[accuse-reception] création impossible (non bloquant):", trackErr);
    }
  }

  // Signature commune FTRANSPORT apposée en fin de chaque e-mail sortant.
  const htmlSigne = appliquerSignatureEmail(html);
  // Lien « Je confirme avoir reçu cet e-mail » : uniquement si activé explicitement
  // (EMAIL_CONFIRMATION_RECEPTION_ACTIVE=true) ET si la ligne de jeton est créée.
  let htmlAvecLien = htmlSigne;
  if (trackingEnabled && Deno.env.get("EMAIL_CONFIRMATION_RECEPTION_ACTIVE") === "true") {
    try {
      const { nouveauJeton, hacherJeton } = await import("./confirmationReception.ts");
      const jeton = nouveauJeton();
      const r = await fetch(`${supabaseUrl}/rest/v1/email_confirmations_reception`, {
        method: "POST",
        headers: { ...restHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ accuse_id: trackingId, token_hash: await hacherJeton(jeton) }),
      });
      if (r.ok) {
        htmlAvecLien = `${htmlSigne}<p style="margin-top:24px;font-family:Arial,sans-serif;font-size:14px"><a href="${supabaseUrl}/functions/v1/email-confirm-reception?t=${jeton}" style="display:inline-block;padding:10px 16px;background:#1f4e9c;color:#ffffff;text-decoration:none;border-radius:4px">Je confirme avoir reçu cet e-mail</a></p>`;
      }
    } catch (e) {
      console.warn("[accuse-reception] lien de confirmation non créé (non bloquant):", e);
    }
  }
  const htmlWithPixel = trackingEnabled
    ? `${htmlAvecLien}<img src="${supabaseUrl}/functions/v1/email-track-open?id=${trackingId}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0" />`
    : html;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      subject,
      html: htmlWithPixel,
      reply_to: replyTo,
      attachments: attachments.length
        ? attachments.map((attachment) => ({
            filename: attachment.name,
            content: attachment.contentBytes,
            content_type: attachment.contentType,
          }))
        : undefined,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    if (trackingEnabled) {
      await fetch(`${supabaseUrl}/rest/v1/email_accuses?id=eq.${trackingId}`, {
        method: "PATCH",
        headers: { ...restHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({
          statut: "echec",
          failed_at: new Date().toISOString(),
          erreur: `Échec envoi (${response.status}): ${details.slice(0, 300)}`,
        }),
      }).catch(() => {});
    }
    throw new Error(`Échec envoi email (${response.status}): ${details.slice(0, 200)}`);
  }

  if (trackingEnabled) {
    try {
      const sent = await response.json();
      if (sent?.id) {
        await fetch(`${supabaseUrl}/rest/v1/email_accuses?id=eq.${trackingId}`, {
          method: "PATCH",
          headers: { ...restHeaders, Prefer: "return=minimal" },
          body: JSON.stringify({ provider_message_id: sent.id }),
        });
      }
    } catch (idErr) {
      console.warn("[accuse-reception] identifiant fournisseur non enregistré:", idErr);
    }
  }
  return trackingEnabled ? trackingId : null;
}
