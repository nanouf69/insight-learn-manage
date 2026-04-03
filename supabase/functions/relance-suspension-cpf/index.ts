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

    console.log(`[relance-non-connectes-post-credentials] Running: ${today.toISOString()}`);

    // Find apprenants with an account (auth_user_id) and an email
    const { data: apprenants, error: fetchErr } = await supabaseAdmin
      .from("apprenants")
      .select("id, nom, prenom, email, auth_user_id, formation_choisie, type_apprenant, date_debut_cours_en_ligne, date_debut_formation, created_at")
      .not("auth_user_id", "is", null)
      .not("email", "is", null)
      .is("deleted_at", null);

    if (fetchErr) throw fetchErr;

    // Filter: account created at least 7 days ago
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Exclude présentiel formations from relances
    const PRESENTIEL_TYPES = ["vtc", "vtc-exam", "taxi", "taxi-exam", "vtc-e-presentiel", "taxi-e-presentiel", "ta-e-presentiel"];
    const isElearning = (a: any) => {
      const type = (a.type_apprenant || a.formation_choisie || "").toLowerCase();
      return !PRESENTIEL_TYPES.includes(type);
    };

    const eligible = (apprenants || []).filter((a: any) => {
      if (!isElearning(a)) return false;
      const startDate = a.date_debut_cours_en_ligne || a.date_debut_formation;
      if (!startDate) return false;
      const start = new Date(startDate);
      const fourteenDaysAgo = new Date(today);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      return start <= sevenDaysAgo && start >= fourteenDaysAgo;
    });

    console.log(`[relance-non-connectes-post-credentials] ${eligible.length} apprenants with credentials sent 7-14 days ago`);

    if (eligible.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun apprenant éligible", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check who has NEVER connected
    const ids = eligible.map((a: any) => a.id);
    const { data: connexions } = await supabaseAdmin
      .from("apprenant_connexions")
      .select("apprenant_id")
      .in("apprenant_id", ids);

    const hasConnected = new Set((connexions || []).map((c: any) => c.apprenant_id));
    const neverConnected = eligible.filter((a: any) => !hasConnected.has(a.id));

    console.log(`[relance-non-connectes-post-credentials] ${neverConnected.length} never connected after 7+ days`);

    if (neverConnected.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Tous les apprenants se sont connectés", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anti-spam: check if already sent this specific email in the last 7 days
    const { data: recentEmails } = await supabaseAdmin
      .from("emails")
      .select("apprenant_id")
      .in("apprenant_id", neverConnected.map((a: any) => a.id))
      .like("subject", "%suspension de votre compte%")
      .gte("sent_at", sevenDaysAgo.toISOString());

    const recentlySent = new Set((recentEmails || []).map((e: any) => e.apprenant_id));
    const toSend = neverConnected.filter((a: any) => !recentlySent.has(a.id));

    console.log(`[relance-non-connectes-post-credentials] ${toSend.length} to send (${recentlySent.size} already sent)`);

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
        const nom = apprenant.nom || "";
        const formation = (apprenant.type_apprenant || apprenant.formation_choisie || "").toUpperCase();

        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">🚨 Risque de suspension de votre compte</h1>
              <p style="color: #fecaca; margin: 5px 0 0;">FTRANSPORT – Centre de formation VTC & TAXI</p>
            </div>
            
            <div style="padding: 30px; background-color: #ffffff;">
              <h2 style="color: #1e40af;">Bonjour ${prenom} ${nom},</h2>
              
              <p style="font-size: 16px; line-height: 1.6; color: #1f2937;">
                Nous vous avons envoyé vos identifiants de connexion à la plateforme de formation <strong>${formation || "VTC/TAXI"}</strong> il y a plus d'une semaine, mais nous constatons que <strong>vous ne vous êtes toujours pas connecté(e)</strong>.
              </p>

              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h3 style="color: #991b1b; margin-top: 0;">⚠️ ATTENTION – Risque de suspension</h3>
                <p style="font-size: 15px; color: #1f2937; line-height: 1.6;">
                  Conformément aux <strong>articles 8 et 9 des Conditions Particulières Titulaires V14</strong>, la Caisse des Dépôts et Consignations (CDC) peut décider de <strong>suspendre votre compte CPF</strong> dans les cas suivants :
                </p>
                <ul style="font-size: 15px; color: #1f2937; line-height: 2;">
                  <li>🚫 <strong>Achat de formation sans connexion</strong> ni réalisation des modules</li>
                  <li>🚫 <strong>Annulations répétées</strong> de sessions de formation</li>
                  <li>🚫 <strong>Absences répétées</strong> aux sessions prévues</li>
                  <li>🚫 <strong>Non-présentation</strong> au début de la formation</li>
                </ul>
              </div>

              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #92400e; margin-top: 0;">💸 Conséquences possibles</h3>
                <p style="font-size: 15px; color: #1f2937; line-height: 1.6;">
                  En cas de suspension, vous pourriez <strong>perdre le financement de votre formation</strong> et ne plus pouvoir utiliser votre CPF pendant une durée déterminée par la CDC. De plus, les sommes déjà engagées pourraient être réclamées.
                </p>
              </div>

              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #1e40af; margin-top: 0;">✅ Ce que vous devez faire</h3>
                <p style="font-size: 15px; color: #1f2937; line-height: 1.6;">
                  Connectez-vous dès maintenant à la plateforme et commencez vos modules de formation. Votre participation active est <strong>obligatoire</strong> pour maintenir votre inscription et votre financement.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${coursUrl}" style="background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
                  🔑 Me connecter maintenant
                </a>
              </div>

              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="font-size: 14px; color: #4b5563; margin: 0;">
                  <strong>📧 Identifiants :</strong> Si vous avez perdu vos identifiants de connexion, contactez-nous immédiatement au <strong>04.28.29.60.91</strong> ou par email à <strong>contact@ftransport.fr</strong>.
                </p>
              </div>

              <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
                Ce message est envoyé automatiquement aux apprenants n'ayant pas accédé à la plateforme après réception de leurs identifiants.
              </p>
            </div>
            
            <div style="background-color: #1f2937; padding: 20px; text-align: center; font-size: 13px; color: #9ca3af;">
              <p style="margin: 0;"><strong>FTRANSPORT</strong> – Centre de formation VTC & TAXI</p>
              <p style="margin: 5px 0 0;">86 Route de Genas, 69003 Lyon</p>
              <p style="margin: 5px 0 0;">📞 04.28.29.60.91 | 📧 contact@ftransport.fr</p>
            </div>
          </div>
        `;

        const subject = `🚨 ${prenom}, risque de suspension de votre compte – Connectez-vous à votre formation !`;

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
              importance: "high",
            },
            saveToSentItems: true,
          }),
        });

        if (sendRes.ok) {
          await supabaseAdmin.from("emails").insert({
            apprenant_id: apprenant.id,
            subject,
            body_preview: `Vous ne vous êtes pas connecté(e) après réception de vos identifiants. Risque de suspension de votre compte CPF.`,
            body_html: emailBody,
            sender_email: senderEmail,
            recipients: [apprenant.email],
            type: "sent",
            is_read: true,
            has_attachments: false,
            sent_at: new Date().toISOString(),
          });
          results.push({ id: apprenant.id, email: apprenant.email, success: true });
          console.log(`[relance-non-connectes-post-credentials] ✅ Sent to ${apprenant.email}`);
        } else {
          const errText = await sendRes.text();
          console.error(`[relance-non-connectes-post-credentials] ❌ Failed for ${apprenant.email}:`, errText);
          results.push({ id: apprenant.id, email: apprenant.email, success: false, error: errText });
        }
      } catch (err: unknown) {
        console.error(`[relance-non-connectes-post-credentials] Error for ${apprenant.email}:`, err);
        results.push({ id: apprenant.id, email: apprenant.email, success: false, error: err instanceof Error ? err.message : String(err) });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (results.length > 0) {
      await supabaseAdmin.from("alertes_systeme").insert({
        type: "relance_suspension_cpf",
        titre: `🚨 Relance suspension CPF – Non connectés après 7 jours`,
        message: `${successCount} email(s) envoyé(s), ${failCount} échec(s)`,
        details: JSON.stringify(results),
      });
    }

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("[relance-non-connectes-post-credentials] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
