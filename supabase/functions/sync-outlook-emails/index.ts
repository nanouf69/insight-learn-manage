import { createClient } from "npm:@supabase/supabase-js@2";
import { sendBrandedEmail } from "../_shared/send-branded-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body?: { content: string; contentType: string };
  from?: { emailAddress: { address: string; name: string } };
  toRecipients?: { emailAddress: { address: string; name: string } }[];
  hasAttachments: boolean;
  isRead: boolean;
  receivedDateTime: string;
  sentDateTime?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function getAccessToken(): Promise<string> {
  const tenantId = Deno.env.get("MS_GRAPH_TENANT_ID");
  const clientId = Deno.env.get("MS_GRAPH_CLIENT_ID");
  const clientSecret = Deno.env.get("MS_GRAPH_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Missing Microsoft Graph credentials");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    console.error("Token error:", await response.text());
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data: TokenResponse = await response.json();
  return data.access_token;
}

async function fetchEmails(
  accessToken: string,
  userEmail: string,
  folder: "inbox" | "sentItems",
  filter?: string
): Promise<EmailMessage[]> {
  const orderBy = folder === "sentItems" ? "sentDateTime desc" : "receivedDateTime desc";

  const params = new URLSearchParams({
    "$top": "200",
    "$orderby": orderBy,
    "$select": "id,subject,bodyPreview,body,from,toRecipients,hasAttachments,isRead,receivedDateTime,sentDateTime",
  });

  if (filter) params.set("$filter", filter);

  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/mailFolders/${folder}/messages?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error(`Error fetching ${folder}:`, await response.text());
    return [];
  }

  const data = await response.json();
  return data.value || [];
}

interface EmailAttachment {
  name: string;
  contentType: string;
  contentBytes: string; // base64
}

async function waitForDeliveryFailure(
  accessToken: string,
  userEmail: string,
  to: string,
  subject: string
): Promise<string | null> {
  await new Promise((resolve) => setTimeout(resolve, 3500));

  const recentInbox = await fetchEmails(accessToken, userEmail, "inbox");
  const normalizedTo = to.toLowerCase();
  const normalizedSubject = subject.toLowerCase();

  const bounce = recentInbox.find((email) => {
    const bounceSubject = (email.subject || "").toLowerCase();
    const body = `${email.bodyPreview || ""} ${email.body?.content || ""}`.toLowerCase();
    return (
      (bounceSubject.startsWith("non remis") || bounceSubject.includes("undeliver") || bounceSubject.includes("delivery failure")) &&
      body.includes(normalizedTo) &&
      (bounceSubject.includes(normalizedSubject.slice(0, 60)) || body.includes(normalizedSubject.slice(0, 60)))
    );
  });

  if (!bounce) return null;

  const bounceText = `${bounce.bodyPreview || ""} ${bounce.body?.content || ""}`;
  const rateLimitMatch = bounceText.match(/550\s+5\.7\.233[^'<\n\r]*/i);
  if (rateLimitMatch) {
    return "Limite quotidienne Microsoft atteinte pour les destinataires externes. Réessayez demain ou augmentez la limite/licence Microsoft.";
  }

  const remoteServerMatch = bounceText.match(/Remote server returned ['"]?([^'<\n\r]+)/i);
  return remoteServerMatch?.[1]?.trim() || "Microsoft a retourné un avis de non-remise pour ce destinataire.";
}

async function sendEmail(
  accessToken: string,
  userEmail: string,
  to: string,
  subject: string,
  body: string,
  requestReadReceipt: boolean = false,
  attachments: EmailAttachment[] = []
): Promise<boolean> {
  const url = `https://graph.microsoft.com/v1.0/users/${userEmail}/sendMail`;

  const graphAttachments = attachments.map(att => ({
    "@odata.type": "#microsoft.graph.fileAttachment",
    name: att.name,
    contentType: att.contentType,
    contentBytes: att.contentBytes,
  }));

  const emailData: any = {
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: body,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
      isDeliveryReceiptRequested: requestReadReceipt,
      isReadReceiptRequested: requestReadReceipt,
    },
    saveToSentItems: true,
  };

  if (graphAttachments.length > 0) {
    emailData.message.attachments = graphAttachments;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    console.error("Error sending email:", await response.text());
    return false;
  }

  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Allow either a real logged-in user OR a trusted server-to-server call
    const authHeader = req.headers.get("Authorization");
    const apikeyHeader = req.headers.get("apikey");
    const isInternalServiceCall =
      authHeader === `Bearer ${supabaseServiceKey}` ||
      apikeyHeader === supabaseServiceKey;

    if (!isInternalServiceCall) {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Non autorisé" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(
          JSON.stringify({ error: "Token invalide" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Admin role check — only admins can use the company Outlook mailbox
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: isAdmin } = await adminClient.rpc('has_role', {
        _user_id: claimsData.claims.sub,
        _role: 'admin',
      });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Réservé aux administrateurs" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const reqBody = await req.json();
    const { action, apprenantId, apprenantEmail, userEmail, to, subject, body, requestReadReceipt } = reqBody;

    const accessToken = await getAccessToken();

    if (action === "sync-all") {
      // Global sync: fetch all recent emails from inbox and sent items
      const syncUserEmail = userEmail || "contact@ftransport.fr";
      const inboxEmails = await fetchEmails(accessToken, syncUserEmail, "inbox");
      const sentEmails = await fetchEmails(accessToken, syncUserEmail, "sentItems");

      // Get existing outlook_message_ids to avoid duplicates
      const { data: existingEmails } = await supabase
        .from("emails")
        .select("outlook_message_id")
        .not("outlook_message_id", "is", null);
      const existingIds = new Set((existingEmails || []).map((e: any) => e.outlook_message_id));

      const newInbox = inboxEmails.filter((e) => !existingIds.has(e.id));
      const newSent = sentEmails.filter((e) => !existingIds.has(e.id));

      // Try to match emails to apprenants by email address
      const { data: apprenants } = await supabase
        .from("apprenants")
        .select("id, email")
        .not("email", "is", null);
      const emailToApprenant = new Map<string, string>();
      (apprenants || []).forEach((a: any) => {
        if (a.email) emailToApprenant.set(a.email.toLowerCase(), a.id);
      });

      const emailsToInsert = [
        ...newInbox.map((email) => {
          const senderEmail = email.from?.emailAddress?.address?.toLowerCase() || "";
          return {
            apprenant_id: emailToApprenant.get(senderEmail) || null,
            outlook_message_id: email.id,
            subject: email.subject || "(sans objet)",
            body_preview: email.bodyPreview,
            body_html: email.body?.content,
            sender_email: email.from?.emailAddress?.address,
            sender_name: email.from?.emailAddress?.name,
            recipients: [syncUserEmail],
            type: "received" as const,
            is_read: email.isRead,
            has_attachments: email.hasAttachments,
            received_at: email.receivedDateTime,
          };
        }),
        ...newSent.map((email) => {
          const recipientEmail = email.toRecipients?.[0]?.emailAddress?.address?.toLowerCase() || "";
          return {
            apprenant_id: emailToApprenant.get(recipientEmail) || null,
            outlook_message_id: email.id,
            subject: email.subject || "(sans objet)",
            body_preview: email.bodyPreview,
            body_html: email.body?.content,
            sender_email: syncUserEmail,
            sender_name: null,
            recipients: email.toRecipients?.map((r) => r.emailAddress?.address) || [],
            type: "sent" as const,
            is_read: true,
            has_attachments: email.hasAttachments,
            sent_at: email.sentDateTime || email.receivedDateTime,
          };
        }),
      ];

      if (emailsToInsert.length > 0) {
        const { error } = await supabase
          .from("emails")
          .upsert(emailsToInsert, {
            onConflict: "outlook_message_id",
            ignoreDuplicates: true,
          });
        if (error) {
          console.error("Error upserting emails:", error);
          throw error;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          synced: emailsToInsert.length,
          inbox: newInbox.length,
          sent: newSent.length,
          totalInbox: inboxEmails.length,
          totalSent: sentEmails.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync") {
      if (!apprenantEmail || !userEmail) {
        return new Response(
          JSON.stringify({ error: "apprenantEmail and userEmail are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch only emails related to the apprenant directly from Outlook
      const normalizedApprenantEmail = apprenantEmail.trim().toLowerCase();
      const escapedEmail = normalizedApprenantEmail.replace(/'/g, "''");

      const relevantInbox = await fetchEmails(
        accessToken,
        userEmail,
        "inbox",
        `from/emailAddress/address eq '${escapedEmail}'`
      );

      const relevantSent = await fetchEmails(
        accessToken,
        userEmail,
        "sentItems",
        `toRecipients/any(r:r/emailAddress/address eq '${escapedEmail}')`
      );

      // Prepare emails for insertion
      const emailsToInsert = [
        ...relevantInbox.map((email) => ({
          apprenant_id: apprenantId,
          outlook_message_id: email.id,
            subject: email.subject || "(sans objet)",
          body_preview: email.bodyPreview,
          body_html: email.body?.content,
          sender_email: email.from?.emailAddress?.address,
          sender_name: email.from?.emailAddress?.name,
          recipients: [userEmail],
          type: "received" as const,
          is_read: email.isRead,
          has_attachments: email.hasAttachments,
          received_at: email.receivedDateTime,
        })),
        ...relevantSent.map((email) => ({
          apprenant_id: apprenantId,
          outlook_message_id: email.id,
            subject: email.subject || "(sans objet)",
          body_preview: email.bodyPreview,
          body_html: email.body?.content,
          sender_email: userEmail,
          sender_name: null,
          recipients: email.toRecipients?.map((r) => r.emailAddress?.address) || [],
          type: "sent" as const,
          is_read: true,
          has_attachments: email.hasAttachments,
          sent_at: email.sentDateTime || email.receivedDateTime,
        })),
      ];

      // Upsert emails
      if (emailsToInsert.length > 0) {
        const { error } = await supabase
          .from("emails")
          .upsert(emailsToInsert, {
            onConflict: "outlook_message_id",
            ignoreDuplicates: false,
          });

        if (error) {
          console.error("Error upserting emails:", error);
          throw error;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          synced: emailsToInsert.length,
          inbox: relevantInbox.length,
          sent: relevantSent.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send") {
      if (!userEmail || !to || !subject || !body) {
        return new Response(
          JSON.stringify({ error: "userEmail, to, subject, and body are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ── Anti-doublon : ne pas réenvoyer le même type d'email au même destinataire dans les dernières 24h ──
      // Override possible via `forceSend: true` dans le body (envois manuels admin légitimes).
      const forceSend = reqBody?.forceSend === true;
      if (!forceSend) {
        try {
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: recentDup } = await supabase
            .from("emails")
            .select("id")
            .eq("type", "sent")
            .eq("subject", subject)
            .contains("recipients", [to])
            .gte("sent_at", since)
            .limit(1)
            .maybeSingle();
          if (recentDup?.id) {
            console.log(`[anti-doublon] Skip email "${subject}" -> ${to} (déjà envoyé < 24h, id=${recentDup.id})`);
            return new Response(
              JSON.stringify({ success: true, skipped: true, reason: "duplicate_within_24h" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (dedupErr) {
          console.warn("[anti-doublon] check failed (non-blocking):", dedupErr);
        }
      }

      // Append company signature if not already present
      const signatureHtml = `<br><br>---<br><strong>FTRANSPORT</strong> — Services Pro<br>86 Route de Genas, 69003 Lyon<br>📞 04.28.29.60.91<br>📧 contact@ftransport.fr`;
      const bodyWithSignature = body.includes("FTRANSPORT") ? body : body + signatureHtml;

      const attachments: EmailAttachment[] = reqBody.attachments || [];

      let success = false;
      let deliveryError: string | null = null;
      try {
        await sendBrandedEmail({
          to,
          subject,
          html: bodyWithSignature,
          replyTo: userEmail !== "contact@ftransport.fr" ? userEmail : undefined,
          attachments,
        });
        success = true;
      } catch (error) {
        deliveryError = error instanceof Error ? error.message : String(error);
        console.error("Branded email error:", deliveryError);
      }

      if (success && !deliveryError) {
        await supabase.from("emails").insert({
          apprenant_id: apprenantId || null,
          subject,
          body_preview: body.substring(0, 200),
          body_html: body,
          sender_email: "contact@ftransport.fr",
          sender_name: "FTRANSPORT",
          recipients: [to],
          type: "sent",
          is_read: true,
          has_attachments: attachments.length > 0,
          sent_at: new Date().toISOString(),
        });
      }

      // Log failure as system alert
      if (!success || deliveryError) {
        await supabase.from("alertes_systeme").insert({
          type: "email_error",
          titre: `Échec envoi email à ${to}`,
          message: deliveryError || `L'envoi de l'email "${subject}" à ${to} a échoué.`,
          details: `Expéditeur: contact@ftransport.fr (Resend)\nDestinataire: ${to}\nObjet: ${subject}\nDate: ${new Date().toISOString()}${deliveryError ? `\nErreur: ${deliveryError}` : ""}`,
        });
      }

      return new Response(
        JSON.stringify({ success: success && !deliveryError, error: deliveryError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'sync' or 'send'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
