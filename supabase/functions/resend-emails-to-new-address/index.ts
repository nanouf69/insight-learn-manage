import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendBrandedEmail } from "../_shared/send-branded-email.ts";

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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Admin check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: claims.claims.sub,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Réservé aux administrateurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { apprenant_id, new_email, old_email } = await req.json();
    if (!apprenant_id || !new_email) {
      return new Response(
        JSON.stringify({ error: "apprenant_id et new_email requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch previously sent emails for this apprenant
    const { data: emails, error: emailsErr } = await supabaseAdmin
      .from("emails")
      .select("id, subject, body_html, body_preview, sent_at, recipients")
      .eq("apprenant_id", apprenant_id)
      .eq("type", "sent")
      .order("sent_at", { ascending: true });

    if (emailsErr) throw emailsErr;

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, resent: 0, message: "Aucun email à renvoyer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderEmail = "contact@ftransport.fr";

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const em of emails) {
      try {
        const originalDate = em.sent_at
          ? new Date(em.sent_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
          : "";
        const banner = `
          <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;margin:0 0 16px;font-family:Arial,sans-serif;font-size:13px;color:#92400e;">
            <strong>📧 Renvoi automatique</strong><br/>
            Ce message vous est renvoyé à votre nouvelle adresse email${old_email ? ` (précédente : ${old_email})` : ""}.
            ${originalDate ? `<br/>Envoi initial le ${originalDate}.` : ""}
          </div>
        `;
        const bodyHtml = (em.body_html || em.body_preview || "").toString();
        const finalHtml = banner + bodyHtml;
        const subject = `[Renvoi] ${em.subject || "(sans objet)"}`;

        try {
          await sendBrandedEmail({ to: new_email, subject, html: finalHtml, replyTo: senderEmail });
          sentCount++;
          await supabaseAdmin.from("emails").insert({
            apprenant_id,
            subject,
            body_preview: `Renvoi vers nouvelle adresse ${new_email}`,
            body_html: finalHtml,
            sender_email: senderEmail,
            sender_name: "FTRANSPORT",
            recipients: [new_email],
            type: "sent",
            is_read: true,
            has_attachments: false,
            sent_at: new Date().toISOString(),
          });
        } catch (sendError) {
          failedCount++;
          errors.push(`${em.subject}: ${sendError instanceof Error ? sendError.message : String(sendError)}`);
        }
      } catch (err) {
        failedCount++;
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    return new Response(
      JSON.stringify({ success: true, resent: sentCount, failed: failedCount, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[resend-emails-to-new-address] Fatal:", err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
