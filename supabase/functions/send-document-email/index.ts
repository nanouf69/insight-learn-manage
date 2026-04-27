import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      apprenantId,
      recipientEmail,
      recipientName,
      subject,
      htmlBody,
      attachmentName,
      attachmentBase64,
      attachmentContentType,
    } = await req.json();

    if (!recipientEmail || !subject || !attachmentBase64 || !attachmentName) {
      return new Response(
        JSON.stringify({ error: "Champs requis manquants (recipientEmail, subject, attachmentBase64, attachmentName)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantId = Deno.env.get("MS_GRAPH_TENANT_ID");
    const clientId = Deno.env.get("MS_GRAPH_CLIENT_ID");
    const clientSecret = Deno.env.get("MS_GRAPH_CLIENT_SECRET");

    if (!tenantId || !clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "MS Graph credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Token MS Graph
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Failed to get MS Graph token", details: tokenData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderEmail = "contact@ftransport.fr";
    const finalHtml = htmlBody || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1a1a2e; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0;">FTRANSPORT</h1>
          <p style="color: #e0e0e0; margin: 5px 0 0;">Centre de formation VTC & TAXI</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <p>Bonjour${recipientName ? " " + recipientName : ""},</p>
          <p>Veuillez trouver ci-joint votre document.</p>
          <p>Cordialement,<br/>L'équipe FTRANSPORT</p>
        </div>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 13px; color: #6b7280;">
          <p><strong>FTRANSPORT</strong> – 86 Route de Genas, 69003 Lyon</p>
          <p>📞 04 28 29 60 91 | 📧 contact@ftransport.fr</p>
        </div>
      </div>
    `;

    const sendUrl = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;
    const sendRes = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: finalHtml },
          toRecipients: [{ emailAddress: { address: recipientEmail } }],
          attachments: [
            {
              "@odata.type": "#microsoft.graph.fileAttachment",
              name: attachmentName,
              contentType: attachmentContentType || "application/pdf",
              contentBytes: attachmentBase64,
            },
          ],
        },
        saveToSentItems: true,
      }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error("[send-document-email] MS Graph error:", errText);
      return new Response(
        JSON.stringify({ error: "Échec envoi email", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log email
    if (apprenantId) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabaseAdmin.from("emails").insert({
        apprenant_id: apprenantId,
        subject,
        body_preview: `Document envoyé : ${attachmentName}`,
        body_html: finalHtml,
        sender_email: senderEmail,
        recipients: [recipientEmail],
        type: "sent",
        is_read: true,
        has_attachments: true,
        sent_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[send-document-email] Error:", err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
