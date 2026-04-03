import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const today = new Date();
    const threeWeeksFromNow = new Date(today);
    threeWeeksFromNow.setDate(threeWeeksFromNow.getDate() + 21);

    // Window: exam between today+14 and today+28 (roughly 3 weeks ± 1 week)
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() + 14);
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + 28);

    const startStr = windowStart.toISOString().split("T")[0];
    const endStr = windowEnd.toISOString().split("T")[0];

    console.log(`[relance-examens] Running. Window: ${startStr} → ${endStr}`);

    // Find apprenants with upcoming exam in 2-4 weeks
    const { data: apprenants, error: fetchErr } = await supabaseAdmin
      .from("apprenants")
      .select("id, nom, prenom, email, auth_user_id, formation_choisie, type_apprenant, date_examen_theorique, modules_autorises")
      .not("auth_user_id", "is", null)
      .not("email", "is", null)
      .not("date_examen_theorique", "is", null)
      .is("deleted_at", null)
      .gte("date_examen_theorique", startStr)
      .lte("date_examen_theorique", endStr);

    if (fetchErr) throw fetchErr;

    // Exclude présentiel formations from relances
    const PRESENTIEL_TYPES = ["vtc", "vtc-exam", "taxi", "taxi-exam", "vtc-e-presentiel", "taxi-e-presentiel", "ta-e-presentiel"];
    const filteredApprenants = (apprenants || []).filter((a: any) => {
      const type = (a.type_apprenant || a.formation_choisie || "").toLowerCase();
      return !PRESENTIEL_TYPES.includes(type);
    });

    console.log(`[relance-examens] ${filteredApprenants.length} e-learning apprenants with exam in window (excluded ${(apprenants || []).length - filteredApprenants.length} présentiel)`);

    if (filteredApprenants.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun apprenant avec examen proche", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get module completion for these apprenants
    const ids = filteredApprenants.map((a: any) => a.id);
    const { data: completions } = await supabaseAdmin
      .from("apprenant_module_completion")
      .select("apprenant_id, module_id")
      .in("apprenant_id", ids);

    // Build completion map: apprenant_id -> set of completed module_ids
    const completionMap = new Map<string, Set<number>>();
    for (const c of completions || []) {
      if (!completionMap.has(c.apprenant_id)) {
        completionMap.set(c.apprenant_id, new Set());
      }
      completionMap.get(c.apprenant_id)!.add(c.module_id);
    }

    // Filter: apprenants who completed less than 50% of their authorized modules
    const behindSchedule = filteredApprenants.filter((a: any) => {
      const authorizedModules: number[] = a.modules_autorises || [];
      if (authorizedModules.length === 0) return false;
      const completed = completionMap.get(a.id) || new Set();
      const completedCount = authorizedModules.filter((m: number) => completed.has(m)).length;
      const ratio = completedCount / authorizedModules.length;
      return ratio < 0.5;
    });

    console.log(`[relance-examens] ${behindSchedule.length} apprenants behind schedule (<50%)`);

    if (behindSchedule.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Tous les apprenants sont à jour", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anti-spam: check if we already sent this type of email in the last 7 days
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentEmails } = await supabaseAdmin
      .from("emails")
      .select("apprenant_id")
      .in("apprenant_id", behindSchedule.map((a: any) => a.id))
      .like("subject", "%examen approche%")
      .gte("sent_at", sevenDaysAgo.toISOString());

    const recentlySent = new Set((recentEmails || []).map((e: any) => e.apprenant_id));
    const toSend = behindSchedule.filter((a: any) => !recentlySent.has(a.id));

    console.log(`[relance-examens] ${toSend.length} to send (${recentlySent.size} already sent recently)`);

    if (toSend.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Relances déjà envoyées", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MS Graph token
    const tenantId = Deno.env.get("MS_GRAPH_TENANT_ID");
    const clientId = Deno.env.get("MS_GRAPH_CLIENT_ID");
    const clientSecret = Deno.env.get("MS_GRAPH_CLIENT_SECRET");

    if (!tenantId || !clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "MS Graph credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        JSON.stringify({ error: "Failed to get MS Graph token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderEmail = "contact@ftransport.fr";
    const coursUrl = "https://insight-learn-manage.lovable.app/cours-public";
    const results: { id: string; email: string; success: boolean; error?: string }[] = [];

    for (const apprenant of toSend) {
      try {
        const prenom = apprenant.prenom || "";
        const examDate = new Date(apprenant.date_examen_theorique);
        const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const formation = (apprenant.type_apprenant || apprenant.formation_choisie || "").toUpperCase();




        const examDateFormatted = examDate.toLocaleDateString("fr-FR", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        });

        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">⚠️ Votre examen approche !</h1>
              <p style="color: #fecaca; margin: 5px 0 0;">FTRANSPORT – Centre de formation VTC & TAXI</p>
            </div>
            
            <div style="padding: 30px; background-color: #ffffff;">
              <h2 style="color: #1e40af;">Bonjour ${prenom},</h2>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #991b1b; margin-top: 0;">🚨 ATTENTION – Examen dans ${daysUntilExam} jour${daysUntilExam > 1 ? "s" : ""} !</h3>
                <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">
                  Votre examen théorique <strong>${formation}</strong> est prévu le <strong>${examDateFormatted}</strong>.
                </p>
                <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">
                  Vous n'avez pas encore terminé tous vos modules de formation. Il est urgent de les compléter avant le jour de l'examen.
                </p>
              </div>

              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #92400e; margin-top: 0;">💸 Risque de frais de repassage</h3>
                <p style="font-size: 15px; color: #1f2937; line-height: 1.6;">
                  Si vous ne terminez pas vos modules à temps et que vous échouez à l'examen, vous devrez <strong>repayer des frais de repassage</strong> pour pouvoir repasser l'examen ultérieurement. Ces frais sont entièrement à votre charge.
                </p>
              </div>

              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #1e40af; margin-top: 0;">📋 Ce que vous devez faire MAINTENANT</h3>
                <ul style="color: #1f2937; font-size: 15px; line-height: 2;">
                  <li>🏃 Terminez vos modules restants le plus vite possible</li>
                  <li>📝 Faites les examens blancs pour vous entraîner</li>
                  <li>🔄 Révisez les modules déjà complétés</li>
                  <li>⏰ Consacrez au minimum 2 à 3 heures par jour à la formation</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${coursUrl}" style="background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
                  🚀 Reprendre mes cours MAINTENANT
                </a>
              </div>
              
              <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="font-size: 15px; line-height: 1.6; margin: 0;">
                  <strong>🤝 Besoin d'aide ?</strong> Contactez-nous au <strong>04.28.29.60.91</strong> ou par email à <strong>contact@ftransport.fr</strong>. Notre équipe est là pour vous accompagner.
                </p>
              </div>

              <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
                Ce message est envoyé automatiquement aux apprenants dont l'examen approche et dont les modules ne sont pas encore terminés.
              </p>
            </div>
            
            <div style="background-color: #1f2937; padding: 20px; text-align: center; font-size: 13px; color: #9ca3af;">
              <p style="margin: 0;"><strong>FTRANSPORT</strong> – Centre de formation VTC & TAXI</p>
              <p style="margin: 5px 0 0;">86 Route de Genas, 69003 Lyon</p>
              <p style="margin: 5px 0 0;">📞 04.28.29.60.91 | 📧 contact@ftransport.fr</p>
            </div>
          </div>
        `;

        const subject = `⚠️ ${prenom}, votre examen approche dans ${daysUntilExam} jours – Terminez vos modules !`;

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
              body: { contentType: "HTML", content: emailBody },
              toRecipients: [{ emailAddress: { address: apprenant.email } }],
            },
            saveToSentItems: true,
          }),
        });

        if (sendRes.ok) {
          await supabaseAdmin.from("emails").insert({
            apprenant_id: apprenant.id,
            subject,
            body_preview: `Votre examen ${formation} est dans ${daysUntilExam} jours. Terminez vos modules de formation au plus vite !`,
            body_html: emailBody,
            sender_email: senderEmail,
            recipients: [apprenant.email],
            type: "sent",
            is_read: true,
            has_attachments: false,
            sent_at: new Date().toISOString(),
          });
          results.push({ id: apprenant.id, email: apprenant.email, success: true });
          console.log(`[relance-examens] ✅ Sent to ${apprenant.email} (exam in ${daysUntilExam}d)`);
        } else {
          const errText = await sendRes.text();
          console.error(`[relance-examens] ❌ Failed for ${apprenant.email}:`, errText);
          results.push({ id: apprenant.id, email: apprenant.email, success: false, error: errText });
        }
      } catch (err) {
        console.error(`[relance-examens] Error for ${apprenant.email}:`, err);
        results.push({ id: apprenant.id, email: apprenant.email, success: false, error: err.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (results.length > 0) {
      await supabaseAdmin.from("alertes_systeme").insert({
        type: "relance_examens_proches",
        titre: `⚠️ Relance examens proches – modules incomplets`,
        message: `${successCount} email(s) envoyé(s), ${failCount} échec(s)`,
        details: JSON.stringify(results),
      });
    }

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[relance-examens] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
