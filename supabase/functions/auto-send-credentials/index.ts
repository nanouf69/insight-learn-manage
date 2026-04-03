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

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`[auto-send-credentials] Running for date: ${today}`);

    // Find ALL apprenants whose formation starts today (with or without account)
    const { data: apprenants, error: fetchErr } = await supabaseAdmin
      .from("apprenants")
      .select("id, nom, prenom, email, auth_user_id, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne, date_debut_formation, date_fin_formation")
      .not("email", "is", null)
      .is("deleted_at", null);

    if (fetchErr) {
      console.error("[auto-send-credentials] Fetch error:", fetchErr);
      throw fetchErr;
    }

    // Filter: date_debut_cours_en_ligne = today OR (no cours date but date_debut_formation = today)
    const eligibleApprenants = (apprenants || []).filter((a: any) => {
      const coursDate = a.date_debut_cours_en_ligne;
      const formationDate = a.date_debut_formation;
      return coursDate === today || (!coursDate && formationDate === today);
    });

    console.log(`[auto-send-credentials] Found ${eligibleApprenants.length} apprenants starting today`);

    if (eligibleApprenants.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun apprenant à notifier aujourd'hui", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check which ones already received credentials today (avoid duplicates)
    const apprenantIds = eligibleApprenants.map((a: any) => a.id);
    const { data: existingEmails } = await supabaseAdmin
      .from("emails")
      .select("apprenant_id")
      .in("apprenant_id", apprenantIds)
      .like("subject", "%identifiants%")
      .gte("sent_at", `${today}T00:00:00`);

    const alreadySent = new Set((existingEmails || []).map((e: any) => e.apprenant_id));

    const toProcess = eligibleApprenants.filter((a: any) => !alreadySent.has(a.id));

    console.log(`[auto-send-credentials] ${toProcess.length} apprenants to process (${alreadySent.size} already sent)`);

    // Get MS Graph token
    const tenantId = Deno.env.get("MS_GRAPH_TENANT_ID");
    const clientId = Deno.env.get("MS_GRAPH_CLIENT_ID");
    const clientSecret = Deno.env.get("MS_GRAPH_CLIENT_SECRET");

    if (!tenantId || !clientId || !clientSecret) {
      console.error("[auto-send-credentials] MS Graph credentials missing");
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
      console.error("[auto-send-credentials] Failed to get MS Graph token");
      return new Response(
        JSON.stringify({ error: "Failed to get MS Graph token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formationLabels: Record<string, string> = {
      "vtc": "Formation VTC Présentiel",
      "vtc-exam": "Formation VTC Présentiel (avec examen)",
      "taxi": "Formation TAXI Présentiel",
      "taxi-exam": "Formation TAXI Présentiel (avec examen)",
      "passerelle-taxi": "Passerelle TAXI → VTC (TA)",
      "vtc-elearning-1099": "Formation VTC E-learning",
      "vtc-elearning": "Formation VTC E-learning (avec examen)",
      "taxi-elearning": "Formation TAXI E-learning",
      "passerelle-taxi-elearning": "Passerelle TAXI → VTC E-learning (TA)",
      "passerelle-vtc-elearning": "Passerelle VTC → TAXI E-learning (VA)",
      "vtc-cours-du-soir": "Formation VTC Cours du soir",
      "vtc-e-presentiel": "Formation VTC E (Présentiel)",
      "taxi-e-presentiel": "Formation TAXI E (Présentiel)",
      "ta-e-presentiel": "Formation TA E (Présentiel)",
      "continue-vtc": "Formation Continue VTC",
      "continue-taxi": "Formation Continue TAXI",
      "repassage-theorique": "Repassage examen théorique",
      "repassage-pratique": "Repassage examen pratique",
      "passage-pratique": "Passage examen pratique",
    };

    const generatePassword = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
      let pwd = "";
      const randomBytes = new Uint8Array(8);
      crypto.getRandomValues(randomBytes);
      for (let i = 0; i < 8; i++) {
        pwd += chars[randomBytes[i] % chars.length];
      }
      return pwd;
    };

    const results: { id: string; email: string; success: boolean; accountCreated?: boolean; error?: string }[] = [];
    const senderEmail = "contact@ftransport.fr";
    const coursUrl = "https://insight-learn-manage.lovable.app/cours-public";

    for (const apprenant of toProcess) {
      try {
        let newPassword = generatePassword();
        let authUserId = apprenant.auth_user_id;

        // ===== STEP 1: Create account if needed =====
        if (!authUserId) {
          console.log(`[auto-send-credentials] Creating account for ${apprenant.email}`);

          const { data: createData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: apprenant.email,
            password: newPassword,
            email_confirm: true,
            user_metadata: {
              full_name: `${apprenant.prenom || ""} ${apprenant.nom || ""}`.trim(),
              is_apprenant: true,
            },
          });

          if (authError) {
            // If user already exists, find and reuse
            if (authError.message.includes("already been registered")) {
              console.log(`[auto-send-credentials] User already exists for ${apprenant.email}, linking...`);
              const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
              const existingUser = listData?.users?.find((u: any) => u.email === apprenant.email);

              if (existingUser) {
                // Update password
                await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: newPassword });
                authUserId = existingUser.id;
              } else {
                console.error(`[auto-send-credentials] Could not find existing user for ${apprenant.email}`);
                results.push({ id: apprenant.id, email: apprenant.email, success: false, error: "Utilisateur existant introuvable" });
                continue;
              }
            } else {
              console.error(`[auto-send-credentials] Account creation failed for ${apprenant.email}:`, authError.message);
              results.push({ id: apprenant.id, email: apprenant.email, success: false, error: authError.message });
              continue;
            }
          } else {
            authUserId = createData?.user?.id;
          }

          if (!authUserId) {
            results.push({ id: apprenant.id, email: apprenant.email, success: false, error: "ID auth manquant" });
            continue;
          }

          // Link auth_user_id to apprenant
          await supabaseAdmin
            .from("apprenants")
            .update({ auth_user_id: authUserId })
            .eq("id", apprenant.id);

          // Also set cours en ligne dates if missing
          const updates: Record<string, string> = {};
          if (!apprenant.date_debut_cours_en_ligne && apprenant.date_debut_formation) {
            updates.date_debut_cours_en_ligne = apprenant.date_debut_formation;
          }
          if (!apprenant.date_fin_cours_en_ligne && apprenant.date_fin_formation) {
            updates.date_fin_cours_en_ligne = apprenant.date_fin_formation;
          }
          if (Object.keys(updates).length > 0) {
            await supabaseAdmin.from("apprenants").update(updates).eq("id", apprenant.id);
          }

          console.log(`[auto-send-credentials] ✅ Account created for ${apprenant.email} (${authUserId})`);
        } else {
          // ===== Account exists, just reset password =====
          const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
            authUserId,
            { password: newPassword }
          );

          if (updateErr) {
            console.error(`[auto-send-credentials] Password reset failed for ${apprenant.email}:`, updateErr);
            results.push({ id: apprenant.id, email: apprenant.email, success: false, error: updateErr.message });
            continue;
          }
        }

        // ===== STEP 2: Send email =====
        const rawFormation = apprenant.formation_choisie || "";
        const formationParts = rawFormation.split(" + ").map((p: string) => formationLabels[p.trim()] || p.trim()).filter(Boolean);
        const formation = formationParts.length > 0 ? formationParts.join(" + ") : "Non spécifiée";
        const dateDebut = apprenant.date_debut_cours_en_ligne || apprenant.date_debut_formation || "Non définie";
        const dateFin = apprenant.date_fin_cours_en_ligne || apprenant.date_fin_formation || "Non définie";
        const prenom = apprenant.prenom || "";
        const nom = apprenant.nom || "";

        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1a1a2e; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">🎓 FTRANSPORT</h1>
              <p style="color: #e0e0e0; margin: 5px 0 0;">Centre de formation VTC & TAXI</p>
            </div>
            
            <div style="padding: 30px; background-color: #ffffff;">
              <h2 style="color: #1a1a2e;">Bonjour ${prenom} ${nom},</h2>
              
              <p>Votre formation commence aujourd'hui ! 🎉 Voici vos identifiants pour accéder à vos cours en ligne.</p>
              
              <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #1e40af; margin-top: 0;">📋 Informations de formation</h3>
                <p><strong>Formation :</strong> ${formation}</p>
                <p><strong>Période des cours :</strong> du <strong>${dateDebut}</strong> au <strong>${dateFin}</strong></p>
              </div>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #92400e; margin-top: 0;">🔐 Vos identifiants de connexion</h3>
                <p><strong>Email :</strong> ${apprenant.email}</p>
                <p><strong>Mot de passe :</strong> <code style="background: #e5e7eb; padding: 2px 8px; border-radius: 4px; font-size: 16px; letter-spacing: 1px;">${newPassword}</code></p>
              </div>

              <p style="color: #6b7280; font-size: 14px;">🔑 Vous pouvez modifier votre mot de passe à tout moment depuis votre espace apprenant.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${coursUrl}" style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
                  🚀 Accéder aux cours en ligne
                </a>
              </div>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #991b1b; margin-top: 0;">💰 Frais d'examen en cas d'échec (à votre charge) :</h3>
                <p style="margin: 5px 0;">• <strong>Examen théorique :</strong> environ 240 €</p>
                <p style="margin: 5px 0;">• <strong>Examen pratique :</strong> environ 200 €</p>
              </div>

              <p style="color: #6b7280; font-size: 14px;">⚠️ Nous vous recommandons de conserver ce mail et de ne pas partager vos identifiants.</p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 13px; color: #6b7280;">
              <p><strong>FTRANSPORT</strong> – Centre de formation VTC & TAXI</p>
              <p>86 Route de Genas, 69003 Lyon</p>
              <p>📞 04.28.29.60.91 | 📧 contact@ftransport.fr</p>
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
              subject: `🎓 Votre formation commence aujourd'hui – Vos identifiants de connexion`,
              body: { contentType: "HTML", content: emailBody },
              toRecipients: [{ emailAddress: { address: apprenant.email } }],
            },
            saveToSentItems: true,
          }),
        });

        if (sendRes.ok) {
          // Log email
          await supabaseAdmin.from("emails").insert({
            apprenant_id: apprenant.id,
            subject: `🎓 Votre formation commence aujourd'hui – Vos identifiants de connexion`,
            body_preview: `Bonjour ${prenom}, votre formation commence aujourd'hui ! Voici vos identifiants.`,
            body_html: emailBody,
            sender_email: senderEmail,
            recipients: [apprenant.email],
            type: "sent",
            is_read: true,
            has_attachments: false,
            sent_at: new Date().toISOString(),
          });
          results.push({ id: apprenant.id, email: apprenant.email, success: true, accountCreated: !apprenant.auth_user_id });
          console.log(`[auto-send-credentials] ✅ Sent to ${apprenant.email} (account created: ${!apprenant.auth_user_id})`);
        } else {
          const errText = await sendRes.text();
          console.error(`[auto-send-credentials] ❌ Failed for ${apprenant.email}:`, errText);
          results.push({ id: apprenant.id, email: apprenant.email, success: false, error: errText });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[auto-send-credentials] Error for ${apprenant.email}:`, err);
        results.push({ id: apprenant.id, email: apprenant.email, success: false, error: msg });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    const accountsCreated = results.filter((r) => r.accountCreated).length;

    // Create admin alert
    if (results.length > 0) {
      await supabaseAdmin.from("alertes_systeme").insert({
        type: "auto_credentials",
        titre: `📧 Envoi automatique des identifiants`,
        message: `${successCount} identifiant(s) envoyé(s), ${accountsCreated} compte(s) créé(s), ${failCount} échec(s)`,
        details: JSON.stringify(results),
      });
    }

    console.log(`[auto-send-credentials] Done: ${successCount} sent, ${accountsCreated} accounts created, ${failCount} failed`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, accountsCreated, failed: failCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[auto-send-credentials] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
