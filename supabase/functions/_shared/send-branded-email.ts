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
}: BrandedEmailParams): Promise<void> {
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
            return;
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

  const htmlWithPixel = trackingEnabled
    ? `${html}<img src="${supabaseUrl}/functions/v1/email-track-open?id=${trackingId}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0" />`
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
}