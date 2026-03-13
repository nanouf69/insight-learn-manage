import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  type_document: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  numero_dossier_cma?: string;
  mot_de_passe_cma?: string;
  type_examen?: string;
  date_examen?: string;
  lieu_examen?: string;
  b2_vierge?: boolean;
  donnees?: Record<string, unknown>;
}

function formatDocumentLabel(type: string): string {
  const labels: Record<string, string> = {
    "dossier-bienvenue": "Récapitulatif d'inscription (Dossier de bienvenue)",
    "analyse-besoin": "Analyse du besoin – Fiche client",
    "projet-professionnel": "Questionnaire Projet Professionnel",
    "test-competences": "Test de compétences avant formation",
    "cgv-acceptation": "Conditions Générales de Vente — Acceptation",
    "cgv-ri-acceptation": "CGV et Règlement Intérieur — Signature",
  };
  return labels[type] || type;
}

function buildEmailHtml(data: NotificationPayload): string {
  const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  const docLabel = formatDocumentLabel(data.type_document);

  let rows = `
    <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Nom</td><td style="padding:6px 12px">${data.nom || "—"}</td></tr>
    <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Prénom</td><td style="padding:6px 12px">${data.prenom || "—"}</td></tr>
    <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Email</td><td style="padding:6px 12px">${data.email || "—"}</td></tr>
    <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Téléphone</td><td style="padding:6px 12px">${data.telephone || "—"}</td></tr>
  `;

  if (data.type_document === "dossier-bienvenue") {
    rows += `
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">N° Dossier CMA</td><td style="padding:6px 12px">${data.numero_dossier_cma || "—"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Mot de passe CMA</td><td style="padding:6px 12px">${data.mot_de_passe_cma || "—"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Type examen</td><td style="padding:6px 12px">${data.type_examen || "—"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Date examen</td><td style="padding:6px 12px">${data.date_examen || "—"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Lieu</td><td style="padding:6px 12px">${data.lieu_examen || "—"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">B2 vierge</td><td style="padding:6px 12px">${data.b2_vierge ? "OUI" : "NON"}</td></tr>
    `;
  }

  // For forms with free-form "donnees" (analyse, projet, competences), display all answers
  if (data.donnees && data.type_document !== "dossier-bienvenue") {
    const { _status, _signed_by, _signed_at, _signature_image, ...answers } = data.donnees as Record<string, unknown>;
    for (const [key, value] of Object.entries(answers)) {
      if (key.startsWith("_")) continue;
      const displayKey = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      let displayValue = "—";
      if (typeof value === "object" && value !== null) {
        displayValue = JSON.stringify(value, null, 2).replace(/\n/g, "<br>");
      } else if (value !== null && value !== undefined) {
        displayValue = String(value);
      }
      rows += `<tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6;white-space:nowrap">${displayKey}</td><td style="padding:6px 12px">${displayValue}</td></tr>`;
    }
  }

  rows += `<tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Document</td><td style="padding:6px 12px">${docLabel}</td></tr>`;
  rows += `<tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Date soumission</td><td style="padding:6px 12px">${now}</td></tr>`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:white;padding:16px 24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:18px">📋 Nouveau document soumis</h2>
        <p style="margin:4px 0 0;font-size:14px;opacity:0.9">${docLabel}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb">
        ${rows}
      </table>
      <div style="padding:12px 24px;background:#f9fafb;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none">
        <p style="margin:0;font-size:12px;color:#6b7280">Email automatique envoyé par la plateforme FTRANSPORT</p>
      </div>
    </div>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: NotificationPayload = await req.json();
    const subject = `[FTRANSPORT] Nouveau document – ${payload.prenom || ""} ${(payload.nom || "").toUpperCase()}`;
    const html = buildEmailHtml(payload);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FTRANSPORT <notifications@ftransport.fr>",
        to: ["contact@ftransport.fr"],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend API error:", JSON.stringify(resendData));
      return new Response(JSON.stringify({ success: false, error: resendData }), {
        status: 200, // Return 200 to not block client
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Email sent successfully:", resendData.id);
    return new Response(JSON.stringify({ success: true, emailId: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-notification-admin:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 200, // Never block the client
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
