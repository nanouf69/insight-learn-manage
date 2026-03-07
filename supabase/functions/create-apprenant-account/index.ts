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

    // Verify caller is admin
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

    const { data: claims, error: claimsErr } = await callerClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
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

    const { apprenant_id, email } = await req.json();

    if (!apprenant_id || !email) {
      return new Response(
        JSON.stringify({ error: "apprenant_id et email requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if apprenant already has an account
    const { data: apprenant } = await supabaseAdmin
      .from("apprenants")
      .select("auth_user_id, nom, prenom")
      .eq("id", apprenant_id)
      .single();

    if (apprenant?.auth_user_id) {
      return new Response(
        JSON.stringify({ error: "Cet apprenant a déjà un compte" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate random password (8 chars, alphanumeric)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 8; i++) {
      password += chars[randomBytes[i] % chars.length];
    }

    // Create auth user with auto-confirm
    let authUser: { user: { id: string } } | null = null;

    const { data: createData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${apprenant?.prenom || ""} ${apprenant?.nom || ""}`.trim(),
        is_apprenant: true,
      },
    });

    if (authError) {
      // If user already exists, find them and reset their password instead
      if (authError.message.includes("already been registered")) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u: any) => u.email === email);
        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: "Utilisateur existant introuvable" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Reset password for existing user
        await supabaseAdmin.auth.admin.updateUser(existingUser.id, { password });
        authUser = { user: { id: existingUser.id } };
      } else {
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      authUser = createData;
    }

    // Link auth user to apprenant
    await supabaseAdmin
      .from("apprenants")
      .update({ auth_user_id: authUser.user.id })
      .eq("id", apprenant_id);

    // Fetch full apprenant data for email
    const { data: fullApprenant } = await supabaseAdmin
      .from("apprenants")
      .select("*")
      .eq("id", apprenant_id)
      .single();

    // Send welcome email via Outlook
    try {
      const tenantId = Deno.env.get("MS_GRAPH_TENANT_ID");
      const clientId = Deno.env.get("MS_GRAPH_CLIENT_ID");
      const clientSecret = Deno.env.get("MS_GRAPH_CLIENT_SECRET");

      if (tenantId && clientId && clientSecret) {
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

        if (accessToken && fullApprenant) {
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
          };
          const rawFormation = fullApprenant.formation_choisie || "";
          const formation = formationLabels[rawFormation] || rawFormation || "Non spécifiée";
          const dateDebut = fullApprenant.date_debut_cours_en_ligne || "Non définie";
          const dateFin = fullApprenant.date_fin_cours_en_ligne || "Non définie";
          const prenom = fullApprenant.prenom || "";
          const nom = fullApprenant.nom || "";
          const coursUrl = "https://insight-learn-manage.lovable.app/cours";

          const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #1a1a2e; padding: 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0;">🎓 FTRANSPORT</h1>
                <p style="color: #e0e0e0; margin: 5px 0 0;">Centre de formation VTC & TAXI</p>
              </div>
              
              <div style="padding: 30px; background-color: #ffffff;">
                <h2 style="color: #1a1a2e;">Bonjour ${prenom} ${nom},</h2>
                
                <p>Votre compte de cours en ligne a été créé avec succès ! 🎉</p>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <h3 style="color: #1e40af; margin-top: 0;">📋 Informations de formation</h3>
                  <p><strong>Formation :</strong> ${formation}</p>
                  <p><strong>Période des cours :</strong> du <strong>${dateDebut}</strong> au <strong>${dateFin}</strong></p>
                </div>
                
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <h3 style="color: #92400e; margin-top: 0;">🔐 Vos identifiants de connexion</h3>
                  <p><strong>Email :</strong> ${email}</p>
                  <p><strong>Mot de passe :</strong> <code style="background: #e5e7eb; padding: 2px 8px; border-radius: 4px; font-size: 16px; letter-spacing: 1px;">${password}</code></p>
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

          const senderEmail = "contact@ftransport.fr";
          const sendUrl = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;
          const sendRes = await fetch(sendUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                subject: `🎓 Vos identifiants de cours en ligne – ${formation}`,
                body: { contentType: "HTML", content: emailBody },
                toRecipients: [{ emailAddress: { address: email } }],
              },
              saveToSentItems: true,
            }),
          });

          if (!sendRes.ok) {
            console.error("Failed to send welcome email:", await sendRes.text());
          } else {
            // Log email in database
            await supabaseAdmin.from("emails").insert({
              apprenant_id: apprenant_id,
              subject: `🎓 Vos identifiants de cours en ligne – ${formation}`,
              body_preview: `Bonjour ${prenom}, votre compte de cours en ligne a été créé.`,
              body_html: emailBody,
              sender_email: senderEmail,
              recipients: [email],
              type: "sent",
              is_read: true,
              has_attachments: false,
              sent_at: new Date().toISOString(),
            });
          }
        }
      }
    } catch (emailErr) {
      console.error("Email sending error (non-blocking):", emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        password,
        email,
        message: `Compte créé pour ${email}. Mot de passe : ${password}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
