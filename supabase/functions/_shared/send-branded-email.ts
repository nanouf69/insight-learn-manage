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
  // Blocage global : apprenants marqués "ne plus recevoir d'emails"
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceKey && to) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/apprenants?select=id&emails_bloques=eq.true&email=eq.${encodeURIComponent(to.trim().toLowerCase())}&limit=1`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          console.log(`[email-bloque] Envoi annulé vers ${to}`);
          return;
        }
      }
    }
  } catch (blockErr) {
    console.warn("[email-bloque] vérification impossible (non bloquant):", blockErr);
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("Service d'envoi email non configuré");


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
      html,
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
    throw new Error(`Échec envoi email (${response.status}): ${details.slice(0, 200)}`);
  }
}