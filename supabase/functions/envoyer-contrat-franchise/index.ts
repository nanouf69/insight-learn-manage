import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fournisseurId, destinataireEmail, destinataireNom, titre, sentPdfUrl } = await req.json();
    if (!fournisseurId || !destinataireEmail) {
      return new Response(JSON.stringify({ error: "fournisseurId et destinataireEmail requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Crée le contrat (token auto-généré côté DB)
    const { data: contrat, error } = await supabase
      .from("contrats_fournisseurs")
      .insert({
        fournisseur_id: fournisseurId,
        type: "franchise",
        titre: titre || "Contrat de Franchise FINALLY ACADEMY / FTRANSPORT",
        status: "envoye",
        destinataire_email: destinataireEmail,
        destinataire_nom: destinataireNom || null,
        sent_at: new Date().toISOString(),
        sent_pdf_url: sentPdfUrl || null,
      })
      .select()
      .single();

    if (error || !contrat) {
      return new Response(JSON.stringify({ error: error?.message || "Création échouée" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = req.headers.get("origin") || "https://gestion.ftransport.fr";
    const signUrl = `${baseUrl}/contrat-signature/${contrat.token}`;

    // Envoi email via MS Graph
    const tenantId = Deno.env.get("MS_GRAPH_TENANT_ID");
    const clientId = Deno.env.get("MS_GRAPH_CLIENT_ID");
    const clientSecret = Deno.env.get("MS_GRAPH_CLIENT_SECRET");

    if (tenantId && clientId && clientSecret) {
      const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId, client_secret: clientSecret,
          scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials",
        }).toString(),
      });
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      if (accessToken) {
        const senderEmail = "contact@ftransport.fr";
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto;">
            <div style="background:#1a1a2e;padding:24px;text-align:center;">
              <h1 style="color:#fff;margin:0;">FTRANSPORT SERVICES PRO</h1>
            </div>
            <div style="padding:30px;background:#fff;">
              <p>Bonjour${destinataireNom ? " " + destinataireNom : ""},</p>
              <p>Veuillez trouver ci-dessous le lien pour consulter, compléter et signer électroniquement le <strong>Contrat de Franchise FINALLY ACADEMY / FTRANSPORT SERVICES PRO</strong>.</p>
              <p style="text-align:center;margin:32px 0;">
                <a href="${signUrl}" style="background:#1a1a2e;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
                  Ouvrir et signer le contrat
                </a>
              </p>
              <p style="font-size:13px;color:#666;">Lien sécurisé personnel — à ne pas partager : <br/><a href="${signUrl}">${signUrl}</a></p>
              <p>Cordialement,<br/>M. Guenichi Naoufal — Gérant FTRANSPORT</p>
            </div>
            <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#6b7280;">
              FTRANSPORT — 86 Route de Genas, 69003 Lyon
            </div>
          </div>`;

        const sendRes = await fetch(`https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              subject: "Signature du contrat de franchise FTRANSPORT",
              body: { contentType: "HTML", content: html },
              toRecipients: [{ emailAddress: { address: destinataireEmail } }],
            },
            saveToSentItems: true,
          }),
        });
        if (!sendRes.ok) {
          const errText = await sendRes.text();
          console.error("[envoyer-contrat-franchise] MS Graph error:", errText);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, contrat, signUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[envoyer-contrat-franchise]", err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
