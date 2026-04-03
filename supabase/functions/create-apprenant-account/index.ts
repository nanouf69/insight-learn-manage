import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOG_PREFIX = "[create-apprenant-account]";

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const formatError = (err: unknown) => {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }

  return {
    name: "UnknownError",
    message: String(err),
    stack: null,
  };
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`${LOG_PREFIX}[${requestId}] Incoming request`, {
    method: req.method,
    url: req.url,
  });

  if (req.method === "OPTIONS") {
    console.log(`${LOG_PREFIX}[${requestId}] CORS preflight handled`);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log(`${LOG_PREFIX}[${requestId}] Step 1 - Read environment variables (start)`);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    console.log(`${LOG_PREFIX}[${requestId}] Step 1 - Read environment variables (done)`, {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      hasAnonKey: !!anonKey,
    });

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse(500, {
        error: "Variables d'environnement manquantes",
        details: {
          hasSupabaseUrl: !!supabaseUrl,
          hasServiceRoleKey: !!serviceRoleKey,
          hasAnonKey: !!anonKey,
        },
        requestId,
      });
    }

    console.log(`${LOG_PREFIX}[${requestId}] Step 2 - Initialize admin client (start)`);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log(`${LOG_PREFIX}[${requestId}] Step 2 - Initialize admin client (done)`);

    console.log(`${LOG_PREFIX}[${requestId}] Step 3 - Verify authorization header (start)`);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, {
        error: "Non autorisé",
        details: "Authorization header manquant",
        requestId,
      });
    }
    console.log(`${LOG_PREFIX}[${requestId}] Step 3 - Verify authorization header (done)`);

    console.log(`${LOG_PREFIX}[${requestId}] Step 4 - Initialize caller client (start)`);
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log(`${LOG_PREFIX}[${requestId}] Step 4 - Initialize caller client (done)`);

    console.log(`${LOG_PREFIX}[${requestId}] Step 5 - Validate caller user (start)`);
    const {
      data: { user: callerUser },
      error: callerErr,
    } = await callerClient.auth.getUser();

    if (callerErr || !callerUser) {
      return jsonResponse(401, {
        error: "Non autorisé",
        details: callerErr?.message || "Utilisateur introuvable",
        requestId,
      });
    }
    console.log(`${LOG_PREFIX}[${requestId}] Step 5 - Validate caller user (done)`, {
      callerUserId: callerUser.id,
    });

    console.log(`${LOG_PREFIX}[${requestId}] Step 6 - Check admin role (start)`);
    const { data: isAdmin, error: isAdminErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: callerUser.id,
      _role: "admin",
    });

    if (isAdminErr) {
      return jsonResponse(500, {
        error: "Échec de vérification du rôle administrateur",
        details: isAdminErr.message,
        requestId,
      });
    }

    if (!isAdmin) {
      return jsonResponse(403, {
        error: "Réservé aux administrateurs",
        requestId,
      });
    }
    console.log(`${LOG_PREFIX}[${requestId}] Step 6 - Check admin role (done)`);

    console.log(`${LOG_PREFIX}[${requestId}] Step 7 - Parse request body (start)`);
    let requestBody: { apprenant_id?: string; email?: string };
    try {
      requestBody = await req.json();
    } catch (parseErr) {
      const details = formatError(parseErr);
      return jsonResponse(400, {
        error: "Body JSON invalide",
        details,
        requestId,
      });
    }

    const { apprenant_id, email } = requestBody;
    console.log(`${LOG_PREFIX}[${requestId}] Step 7 - Parse request body (done)`, {
      apprenantId: apprenant_id ?? null,
      hasEmail: !!email,
    });

    if (!apprenant_id || !email) {
      return jsonResponse(400, {
        error: "apprenant_id et email requis",
        requestId,
      });
    }

    console.log(`${LOG_PREFIX}[${requestId}] Step 8 - Fetch apprenant (start)`);
    const { data: apprenant, error: apprenantErr } = await supabaseAdmin
      .from("apprenants")
      .select("auth_user_id, nom, prenom")
      .eq("id", apprenant_id)
      .single();

    if (apprenantErr) {
      return jsonResponse(404, {
        error: "Apprenant introuvable",
        details: apprenantErr.message,
        requestId,
      });
    }

    if (apprenant?.auth_user_id) {
      return jsonResponse(409, {
        error: "Cet apprenant a déjà un compte",
        requestId,
      });
    }
    console.log(`${LOG_PREFIX}[${requestId}] Step 8 - Fetch apprenant (done)`);

    console.log(`${LOG_PREFIX}[${requestId}] Step 9 - Generate password (start)`);
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 8; i++) {
      password += chars[randomBytes[i] % chars.length];
    }
    console.log(`${LOG_PREFIX}[${requestId}] Step 9 - Generate password (done)`);

    console.log(`${LOG_PREFIX}[${requestId}] Step 10 - Create auth user (start)`);
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
      console.log(`${LOG_PREFIX}[${requestId}] Step 10 - Create auth user failed`, {
        message: authError.message,
      });

      if (authError.message.includes("already been registered")) {
        console.log(`${LOG_PREFIX}[${requestId}] Step 11 - Existing user flow (start)`);
        // Use getUserByEmail instead of listing all users (pagination issue)
        const { data: existingUserData, error: getUserErr } = await supabaseAdmin.auth.admin.getUserByEmail(email);

        if (getUserErr) {
          console.log(`${LOG_PREFIX}[${requestId}] Step 11 - getUserByEmail failed`, { message: getUserErr.message });
          return jsonResponse(400, {
            error: "Utilisateur existant introuvable",
            details: getUserErr.message,
            requestId,
          });
        }

        const existingUser = existingUserData?.user;

        if (!existingUser) {
          return jsonResponse(400, {
            error: "Utilisateur existant introuvable",
            requestId,
          });
        }

        console.log(`${LOG_PREFIX}[${requestId}] Step 11 - Update existing user password (start)`, {
          existingUserId: existingUser.id,
        });

        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password,
        });

        if (updateErr) {
          return jsonResponse(500, {
            error: "Échec de mise à jour du mot de passe utilisateur",
            details: updateErr.message,
            requestId,
          });
        }

        authUser = { user: { id: existingUser.id } };
        console.log(`${LOG_PREFIX}[${requestId}] Step 11 - Update existing user password (done)`);
      } else {
        return jsonResponse(400, {
          error: authError.message,
          requestId,
        });
      }
    } else {
      authUser = createData;
      console.log(`${LOG_PREFIX}[${requestId}] Step 10 - Create auth user (done)`, {
        authUserId: authUser?.user?.id ?? null,
      });
    }

    if (!authUser?.user?.id) {
      return jsonResponse(500, {
        error: "ID utilisateur auth manquant après création/mise à jour",
        requestId,
      });
    }

    console.log(`${LOG_PREFIX}[${requestId}] Step 12 - Link auth user to apprenant (start)`);
    const { error: linkErr } = await supabaseAdmin
      .from("apprenants")
      .update({ auth_user_id: authUser.user.id })
      .eq("id", apprenant_id);

    if (linkErr) {
      return jsonResponse(500, {
        error: "Échec de liaison du compte à l'apprenant",
        details: linkErr.message,
        requestId,
      });
    }
    console.log(`${LOG_PREFIX}[${requestId}] Step 12 - Link auth user to apprenant (done)`);

    console.log(`${LOG_PREFIX}[${requestId}] Step 13 - Fetch full apprenant for email (start)`);
    const { data: fullApprenant, error: fullApprenantErr } = await supabaseAdmin
      .from("apprenants")
      .select("*")
      .eq("id", apprenant_id)
      .single();

    if (fullApprenantErr) {
      console.log(`${LOG_PREFIX}[${requestId}] Step 13 - Fetch full apprenant for email failed`, {
        message: fullApprenantErr.message,
      });
    } else {
      console.log(`${LOG_PREFIX}[${requestId}] Step 13 - Fetch full apprenant for email (done)`);
    }

    console.log(`${LOG_PREFIX}[${requestId}] Step 14 - Send welcome email flow (start)`);
    try {
      const tenantId = Deno.env.get("MS_GRAPH_TENANT_ID");
      const clientId = Deno.env.get("MS_GRAPH_CLIENT_ID");
      const clientSecret = Deno.env.get("MS_GRAPH_CLIENT_SECRET");

      console.log(`${LOG_PREFIX}[${requestId}] Step 14 - Email env check`, {
        hasTenantId: !!tenantId,
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
      });

      if (tenantId && clientId && clientSecret) {
        console.log(`${LOG_PREFIX}[${requestId}] Step 14.1 - Get MS Graph token (start)`);
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
        console.log(`${LOG_PREFIX}[${requestId}] Step 14.1 - Get MS Graph token (done)`, {
          ok: tokenRes.ok,
          hasAccessToken: !!accessToken,
        });

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
            "vtc-e-presentiel": "Formation VTC E (Présentiel)",
            "taxi-e-presentiel": "Formation TAXI E (Présentiel)",
            "ta-e-presentiel": "Formation TA E (Présentiel)",
            "continue-vtc": "Formation Continue VTC",
            "continue-taxi": "Formation Continue TAXI",
            "repassage-theorique": "Repassage examen théorique",
            "repassage-pratique": "Repassage examen pratique",
            "passage-pratique": "Passage examen pratique",
          };

          const rawFormation = fullApprenant.formation_choisie || "";
          const formationParts = rawFormation
            .split(" + ")
            .map((p: string) => formationLabels[p.trim()] || p.trim())
            .filter(Boolean);
          const formation = formationParts.length > 0 ? formationParts.join(" + ") : "Non spécifiée";
          const dateDebut = fullApprenant.date_debut_cours_en_ligne || "Non définie";
          const dateFin = fullApprenant.date_fin_cours_en_ligne || "Non définie";
          const prenom = fullApprenant.prenom || "";
          const nom = fullApprenant.nom || "";
          const coursUrl = "https://insight-learn-manage.lovable.app/cours-public";

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

          console.log(`${LOG_PREFIX}[${requestId}] Step 14.2 - Send welcome email (start)`);
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
            const sendErrText = await sendRes.text();
            console.error(`${LOG_PREFIX}[${requestId}] Step 14.2 - Send welcome email failed`, sendErrText);
          } else {
            console.log(`${LOG_PREFIX}[${requestId}] Step 14.2 - Send welcome email (done)`);

            console.log(`${LOG_PREFIX}[${requestId}] Step 14.3 - Insert email log in DB (start)`);
            const { error: emailInsertErr } = await supabaseAdmin.from("emails").insert({
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

            if (emailInsertErr) {
              console.error(`${LOG_PREFIX}[${requestId}] Step 14.3 - Insert email log in DB failed`, emailInsertErr.message);
            } else {
              console.log(`${LOG_PREFIX}[${requestId}] Step 14.3 - Insert email log in DB (done)`);
            }
          }
        }
      }
    } catch (emailErr) {
      const details = formatError(emailErr);
      console.error(`${LOG_PREFIX}[${requestId}] Step 14 - Email flow error (non-blocking)`, details);
    }

    console.log(`${LOG_PREFIX}[${requestId}] Success response`);
    return jsonResponse(200, {
      success: true,
      password,
      email,
      message: `Compte créé pour ${email}. Mot de passe : ${password}`,
      requestId,
    });
  } catch (err) {
    const details = formatError(err);
    console.error(`${LOG_PREFIX}[${requestId}] Global error`, details);

    return jsonResponse(500, {
      error: details.message,
      details,
      requestId,
    });
  }
});