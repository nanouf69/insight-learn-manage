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
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    console.log(`[relance-inactifs] Running for date: ${today.toISOString()}`);

    // Find apprenants with active course access
    const { data: apprenants, error: fetchErr } = await supabaseAdmin
      .from("apprenants")
      .select("id, nom, prenom, email, auth_user_id, formation_choisie, type_apprenant, date_debut_cours_en_ligne, date_fin_cours_en_ligne, date_debut_formation, date_fin_formation")
      .not("auth_user_id", "is", null)
      .not("email", "is", null);

    if (fetchErr) throw fetchErr;

    // Exclude présentiel formations from relances
    const PRESENTIEL_TYPES = ["vtc", "vtc-exam", "taxi", "taxi-exam", "vtc-e-presentiel", "taxi-e-presentiel", "ta-e-presentiel"];
    const isElearning = (a: any) => {
      const type = (a.type_apprenant || a.formation_choisie || "").toLowerCase();
      return !PRESENTIEL_TYPES.includes(type);
    };

    // Filter: active course period + e-learning only
    const eligible = (apprenants || []).filter((a: any) => {
      if (!isElearning(a)) return false;
      const startDate = a.date_debut_cours_en_ligne || a.date_debut_formation;
      const endDate = a.date_fin_cours_en_ligne || a.date_fin_formation;
      if (!startDate) return false;
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : null;
      return today >= start && (!end || today <= end);
    });

    console.log(`[relance-inactifs] ${eligible.length} apprenants with active access`);

    if (eligible.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun apprenant éligible", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get latest connexion for each eligible apprenant
    const ids = eligible.map((a: any) => a.id);
    const { data: connexions } = await supabaseAdmin
      .from("apprenant_connexions")
      .select("apprenant_id, last_seen_at, started_at")
      .in("apprenant_id", ids)
      .order("started_at", { ascending: false });

    // Build map of latest activity per apprenant
    const latestActivity = new Map<string, Date>();
    for (const c of connexions || []) {
      const seen = new Date(c.last_seen_at || c.started_at);
      const current = latestActivity.get(c.apprenant_id);
      if (!current || seen > current) {
        latestActivity.set(c.apprenant_id, seen);
      }
    }

    // Filter: has connected before BUT last seen > 2 days ago
    const inactive = eligible.filter((a: any) => {
      const lastSeen = latestActivity.get(a.id);
      if (!lastSeen) return false; // Never connected = handled by relance-non-connectes
      return lastSeen < twoDaysAgo;
    });

    console.log(`[relance-inactifs] ${inactive.length} inactive for 2+ days`);

    if (inactive.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun apprenant inactif", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Avoid spamming: check if we already sent a support email in the last 2 days
    const inactiveIds = inactive.map((a: any) => a.id);
    const { data: recentEmails } = await supabaseAdmin
      .from("emails")
      .select("apprenant_id")
      .in("apprenant_id", inactiveIds)
      .like("subject", "%Nous sommes là pour vous%")
      .gte("sent_at", twoDaysAgo.toISOString());

    const recentlySent = new Set((recentEmails || []).map((e: any) => e.apprenant_id));
    const toSend = inactive.filter((a: any) => !recentlySent.has(a.id));

    console.log(`[relance-inactifs] ${toSend.length} to send (${recentlySent.size} already sent recently)`);

    if (toSend.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Relances déjà envoyées", count: 0 }),
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
      signal: AbortSignal.timeout(10000),
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
        const lastSeen = latestActivity.get(apprenant.id)!;
        const daysSinceLastSeen = Math.floor((today.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
        const formation = (apprenant.type_apprenant || apprenant.formation_choisie || "").toUpperCase();

        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">💪 Nous sommes là pour vous !</h1>
              <p style="color: #bfdbfe; margin: 5px 0 0;">FTRANSPORT – Centre de formation VTC & TAXI</p>
            </div>
            
            <div style="padding: 30px; background-color: #ffffff;">
              <h2 style="color: #1e40af;">Bonjour ${prenom},</h2>
              
              <p style="font-size: 16px; line-height: 1.6;">Nous avons remarqué que vous ne vous êtes pas connecté(e) à vos cours en ligne depuis <strong>${daysSinceLastSeen} jour${daysSinceLastSeen > 1 ? "s" : ""}</strong>. Nous espérons que tout va bien ! 🙂</p>
              
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h3 style="color: #1e40af; margin-top: 0;">🎯 Votre réussite est notre priorité</h3>
                <p style="font-size: 15px; color: #1f2937; line-height: 1.6;">
                  La régularité est la clé du succès pour votre formation <strong>${formation || "VTC/TAXI"}</strong>. Même 30 minutes par jour font une grande différence !
                </p>
              </div>

              <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #166534; margin-top: 0;">💡 Nos conseils pour reprendre en douceur</h3>
                <ul style="color: #1f2937; font-size: 15px; line-height: 2;">
                  <li>📚 Reprenez là où vous vous êtes arrêté(e)</li>
                  <li>⏰ Fixez-vous un créneau régulier chaque jour (matin ou soir)</li>
                  <li>🧠 Révisez les modules déjà vus pour consolider vos acquis</li>
                  <li>✍️ Testez-vous avec les examens blancs pour évaluer votre progression</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${coursUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
                  📖 Reprendre mes cours
                </a>
              </div>
              
              <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #854d0e; margin-top: 0;">🤝 Besoin d'un coup de pouce ?</h3>
                <p style="font-size: 15px; line-height: 1.6;">Si vous rencontrez des difficultés avec un module ou si vous avez des questions, n'hésitez pas à nous contacter. Notre équipe pédagogique est là pour vous accompagner !</p>
                <p>📞 <strong>04.28.29.60.91</strong> | 📧 <strong>contact@ftransport.fr</strong></p>
              </div>

              <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
                Ce message de soutien est envoyé automatiquement pour vous encourager dans votre parcours de formation.
              </p>
            </div>
            
            <div style="background-color: #1f2937; padding: 20px; text-align: center; font-size: 13px; color: #9ca3af;">
              <p style="margin: 0;"><strong>FTRANSPORT</strong> – Centre de formation VTC & TAXI</p>
              <p style="margin: 5px 0 0;">86 Route de Genas, 69003 Lyon</p>
              <p style="margin: 5px 0 0;">📞 04.28.29.60.91 | 📧 contact@ftransport.fr</p>
            </div>
          </div>
        `;

        const subject = `💪 ${prenom}, nous sommes là pour vous – Reprenez vos cours en ligne !`;

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
            body_preview: `Bonjour ${prenom}, vous ne vous êtes pas connecté(e) depuis ${daysSinceLastSeen} jours. Nous sommes là pour vous soutenir !`,
            body_html: emailBody,
            sender_email: senderEmail,
            recipients: [apprenant.email],
            type: "sent",
            is_read: true,
            has_attachments: false,
            sent_at: new Date().toISOString(),
          });
          results.push({ id: apprenant.id, email: apprenant.email, success: true });
          console.log(`[relance-inactifs] ✅ Sent to ${apprenant.email}`);
        } else {
          const errText = await sendRes.text();
          console.error(`[relance-inactifs] ❌ Failed for ${apprenant.email}:`, errText);
          results.push({ id: apprenant.id, email: apprenant.email, success: false, error: errText });
        }
      } catch (err) {
        console.error(`[relance-inactifs] Error for ${apprenant.email}:`, err);
        results.push({ id: apprenant.id, email: apprenant.email, success: false, error: err.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (results.length > 0) {
      await supabaseAdmin.from("alertes_systeme").insert({
        type: "relance_inactifs",
        titre: `💪 Relance de soutien apprenants inactifs`,
        message: `${successCount} email(s) de soutien envoyé(s), ${failCount} échec(s)`,
        details: JSON.stringify(results),
      });
    }

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[relance-inactifs] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
