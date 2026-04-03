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
    const todayStr = today.toISOString().split("T")[0];

    console.log(`[relance-non-connectes] Running for date: ${todayStr}`);

    // Find apprenants with active course access (started but not finished)
    // who have an auth account and email
    const { data: apprenants, error: fetchErr } = await supabaseAdmin
      .from("apprenants")
      .select("id, nom, prenom, email, auth_user_id, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne, date_debut_formation, date_fin_formation")
      .not("auth_user_id", "is", null)
      .not("email", "is", null);

    if (fetchErr) {
      console.error("[relance-non-connectes] Fetch error:", fetchErr);
      throw fetchErr;
    }

    // Exclude présentiel formations from relances
    const PRESENTIEL_TYPES = ["vtc", "vtc-exam", "taxi", "taxi-exam", "vtc-e-presentiel", "taxi-e-presentiel", "ta-e-presentiel"];
    const isElearning = (a: any) => {
      const type = (a.type_apprenant || a.formation_choisie || "").toLowerCase();
      return !PRESENTIEL_TYPES.includes(type);
    };

    // Filter: course period has started (at least 3 days ago) and not ended yet + e-learning only
    const eligibleApprenants = (apprenants || []).filter((a: any) => {
      if (!isElearning(a)) return false;
      const startDate = a.date_debut_cours_en_ligne || a.date_debut_formation;
      const endDate = a.date_fin_cours_en_ligne || a.date_fin_formation;
      if (!startDate) return false;

      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : null;

      const threeDaysAfterStart = new Date(start);
      threeDaysAfterStart.setDate(threeDaysAfterStart.getDate() + 3);

      const hasStarted = today >= threeDaysAfterStart;
      const hasNotEnded = !end || today <= end;

      return hasStarted && hasNotEnded;
    });

    console.log(`[relance-non-connectes] ${eligibleApprenants.length} apprenants with active access`);

    if (eligibleApprenants.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun apprenant éligible", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check which ones have NEVER connected
    const apprenantIds = eligibleApprenants.map((a: any) => a.id);
    const { data: connexions } = await supabaseAdmin
      .from("apprenant_connexions")
      .select("apprenant_id")
      .in("apprenant_id", apprenantIds);

    const connectedIds = new Set((connexions || []).map((c: any) => c.apprenant_id));
    const neverConnected = eligibleApprenants.filter((a: any) => !connectedIds.has(a.id));

    console.log(`[relance-non-connectes] ${neverConnected.length} never connected`);

    if (neverConnected.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Tous les apprenants se sont déjà connectés", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if we already sent a relance in the last 3 days (avoid spamming)
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const neverConnectedIds = neverConnected.map((a: any) => a.id);

    const { data: recentRelances } = await supabaseAdmin
      .from("emails")
      .select("apprenant_id")
      .in("apprenant_id", neverConnectedIds)
      .like("subject", "%URGENT%cours en ligne%")
      .gte("sent_at", threeDaysAgo.toISOString());

    const recentlySent = new Set((recentRelances || []).map((e: any) => e.apprenant_id));
    const toSend = neverConnected.filter((a: any) => !recentlySent.has(a.id));

    console.log(`[relance-non-connectes] ${toSend.length} to send (${recentlySent.size} already relanced recently)`);

    if (toSend.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Relances déjà envoyées récemment", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get MS Graph token
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
        const nom = apprenant.nom || "";
        const startDate = apprenant.date_debut_cours_en_ligne || apprenant.date_debut_formation || "";
        const endDate = apprenant.date_fin_cours_en_ligne || apprenant.date_fin_formation || "";

        // Calculate days since start
        const start = new Date(startDate);
        const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">⚠️ ALERTE FORMATION</h1>
              <p style="color: #fecaca; margin: 5px 0 0;">FTRANSPORT – Centre de formation VTC & TAXI</p>
            </div>
            
            <div style="padding: 30px; background-color: #ffffff;">
              <h2 style="color: #991b1b;">Bonjour ${prenom} ${nom},</h2>
              
              <p style="font-size: 16px; line-height: 1.6;">Nous constatons que vous <strong>ne vous êtes toujours pas connecté(e)</strong> à vos cours en ligne, alors que votre accès est ouvert depuis <strong>${daysSinceStart} jours</strong>.</p>
              
              <div style="background-color: #fef2f2; border: 2px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 8px;">
                <h3 style="color: #991b1b; margin-top: 0;">🚨 ATTENTION – Risque de perte de votre financement CPF</h3>
                <p style="font-size: 15px; color: #1f2937; line-height: 1.6;">
                  En cas de <strong>non-réalisation de votre formation</strong>, vous risquez :
                </p>
                <ul style="color: #1f2937; font-size: 15px; line-height: 2;">
                  <li>La <strong>perte totale de votre financement CPF</strong> engagé pour cette formation</li>
                  <li>L'<strong>obligation de rembourser</strong> les sommes déjà versées par la Caisse des Dépôts</li>
                  <li>Une <strong>suspension de votre compte CPF</strong> pouvant aller d'une semaine à un an (Article 7 des CGU du CPF)</li>
                  <li>L'<strong>impossibilité d'utiliser votre CPF</strong> pour une future formation pendant la période de suspension</li>
                </ul>
              </div>

              <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #1e40af; margin-top: 0;">📋 Vos dates de formation</h3>
                <p><strong>Début des cours :</strong> ${startDate}</p>
                <p><strong>Fin des cours :</strong> ${endDate}</p>
                <p style="color: #dc2626; font-weight: bold;">⏰ Votre accès est actif – connectez-vous dès maintenant !</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${coursUrl}" style="background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block; text-transform: uppercase;">
                  🚀 Me connecter maintenant
                </a>
              </div>
              
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #92400e; margin-top: 0;">💡 Besoin d'aide ?</h3>
                <p>Si vous avez perdu vos identifiants ou rencontrez un problème technique, contactez-nous immédiatement :</p>
                <p>📞 <strong>04.28.29.60.91</strong> | 📧 <strong>contact@ftransport.fr</strong></p>
              </div>

              <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
                Ce message est envoyé automatiquement car aucune connexion n'a été détectée sur votre espace de formation en ligne.
                Si vous avez déjà commencé votre formation, veuillez ignorer ce message.
              </p>
            </div>
            
            <div style="background-color: #1f2937; padding: 20px; text-align: center; font-size: 13px; color: #9ca3af;">
              <p style="margin: 0;"><strong>FTRANSPORT</strong> – Centre de formation VTC & TAXI</p>
              <p style="margin: 5px 0 0;">86 Route de Genas, 69003 Lyon</p>
              <p style="margin: 5px 0 0;">📞 04.28.29.60.91 | 📧 contact@ftransport.fr</p>
            </div>
          </div>
        `;

        const subject = `⚠️ URGENT : Vous ne vous êtes pas connecté(e) à vos cours en ligne – Risque CPF`;

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
            body_preview: `Bonjour ${prenom}, vous ne vous êtes pas connecté(e) à vos cours en ligne depuis ${daysSinceStart} jours.`,
            body_html: emailBody,
            sender_email: senderEmail,
            recipients: [apprenant.email],
            type: "sent",
            is_read: true,
            has_attachments: false,
            sent_at: new Date().toISOString(),
          });
          results.push({ id: apprenant.id, email: apprenant.email, success: true });
          console.log(`[relance-non-connectes] ✅ Sent to ${apprenant.email}`);
        } else {
          const errText = await sendRes.text();
          console.error(`[relance-non-connectes] ❌ Failed for ${apprenant.email}:`, errText);
          results.push({ id: apprenant.id, email: apprenant.email, success: false, error: errText });
        }
      } catch (err: unknown) {
        console.error(`[relance-non-connectes] Error for ${apprenant.email}:`, err);
        results.push({ id: apprenant.id, email: apprenant.email, success: false, error: err instanceof Error ? err.message : String(err) });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (results.length > 0) {
      await supabaseAdmin.from("alertes_systeme").insert({
        type: "relance_non_connectes",
        titre: `⚠️ Relance apprenants non connectés`,
        message: `${successCount} relance(s) envoyée(s), ${failCount} échec(s)`,
        details: JSON.stringify(results),
      });
    }

    console.log(`[relance-non-connectes] Done: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("[relance-non-connectes] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
