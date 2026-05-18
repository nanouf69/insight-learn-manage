import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // GET ?token=xxx  -> infos contrat pour la page de signature
    if (req.method === "GET") {
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Token requis" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("contrats_fournisseurs")
        .select("id, titre, type, status, destinataire_nom, destinataire_email, representant_nom, lieu_signature, signed_at, signed_pdf_url")
        .eq("token", token)
        .maybeSingle();
      if (error || !data) {
        return new Response(JSON.stringify({ error: "Contrat introuvable" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ contrat: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST -> soumission de la signature
    const body = await req.json();
    const { token, representantNom, lieu, signatureDataUrl, pdfBase64 } = body || {};
    if (!token || !representantNom || !signatureDataUrl || !pdfBase64) {
      return new Response(JSON.stringify({ error: "Champs requis manquants" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contrat, error: fetchErr } = await supabase
      .from("contrats_fournisseurs")
      .select("id, fournisseur_id, status")
      .eq("token", token)
      .maybeSingle();
    if (fetchErr || !contrat) {
      return new Response(JSON.stringify({ error: "Contrat introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (contrat.status === "signe") {
      return new Response(JSON.stringify({ error: "Contrat déjà signé" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload PDF
    const cleanedB64 = (pdfBase64 as string).replace(/^data:[^;]+;base64,/, "");
    const bytes = Uint8Array.from(atob(cleanedB64), (c) => c.charCodeAt(0));
    const safeName = `${contrat.id}-${Date.now()}.pdf`;
    const path = `contrats-signes/${contrat.fournisseur_id}/${safeName}`;

    const { error: upErr } = await supabase.storage
      .from("fournisseur-documents")
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (upErr) {
      return new Response(JSON.stringify({ error: "Upload PDF échoué: " + upErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: pub } = supabase.storage.from("fournisseur-documents").getPublicUrl(path);

    const { error: updErr } = await supabase
      .from("contrats_fournisseurs")
      .update({
        status: "signe",
        representant_nom: representantNom,
        lieu_signature: lieu || "Lyon",
        signature_data_url: signatureDataUrl,
        signed_at: new Date().toISOString(),
        signed_pdf_url: pub.publicUrl,
        signed_pdf_path: path,
      })
      .eq("id", contrat.id);
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notification email admin (best-effort)
    try {
      const tenantId = Deno.env.get("MS_GRAPH_TENANT_ID");
      const clientId = Deno.env.get("MS_GRAPH_CLIENT_ID");
      const clientSecret = Deno.env.get("MS_GRAPH_CLIENT_SECRET");
      if (tenantId && clientId && clientSecret) {
        const tk = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId, client_secret: clientSecret,
            scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials",
          }).toString(),
        }).then(r => r.json());
        if (tk.access_token) {
          await fetch(`https://graph.microsoft.com/v1.0/users/contact@ftransport.fr/sendMail`, {
            method: "POST",
            headers: { Authorization: `Bearer ${tk.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: {
                subject: "✅ Contrat franchise signé par FINALLY ACADEMY",
                body: { contentType: "HTML", content: `<p>Le contrat a été signé par <strong>${representantNom}</strong> le ${new Date().toLocaleString("fr-FR")}.</p><p><a href="${pub.publicUrl}">Télécharger le PDF signé</a></p>` },
                toRecipients: [{ emailAddress: { address: "contact@ftransport.fr" } }],
              },
              saveToSentItems: true,
            }),
          });
        }
      }
    } catch (e) {
      console.warn("Notification admin failed:", e);
    }

    return new Response(JSON.stringify({ success: true, signed_pdf_url: pub.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[signer-contrat-franchise]", err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
