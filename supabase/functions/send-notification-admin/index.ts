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
    "dossier-bienvenue": "Recapitulatif d'inscription (Dossier de bienvenue)",
    "analyse-besoin": "Analyse du besoin - Fiche client",
    "projet-professionnel": "Questionnaire Projet Professionnel",
    "test-competences": "Test de competences avant formation",
    "cgv-acceptation": "Conditions Generales de Vente - Acceptation",
    "cgv-ri-acceptation": "CGV et Reglement Interieur - Signature",
    "evaluation-acquis": "Evaluation des acquis",
    "satisfaction": "Questionnaire de satisfaction",
  };
  return labels[type] || type;
}

function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "OUI" : "NON";
  if (typeof value === "string") return value || "—";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.map((v, i) => {
      if (typeof v === "object" && v !== null) {
        return Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(", ");
      }
      return String(v);
    }).join("<br>");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([k]) => !k.startsWith("_"))
      .map(([k, v]) => `<strong>${k.replace(/_/g, " ")}:</strong> ${formatAnswerValue(v)}`)
      .join("<br>");
  }
  return String(value);
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bNom\b/, "Nom")
    .replace(/\bPrenom\b/, "Prenom");
}

function buildSection(title: string, rows: [string, string][]): string {
  if (rows.length === 0) return "";
  let html = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr>
        <td style="padding:10px 16px;border-bottom:2px solid #6C3FA0">
          <h3 style="margin:0;font-size:15px;color:#6C3FA0;text-transform:uppercase;letter-spacing:0.5px">${title}</h3>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
  `;
  rows.forEach(([label, value], i) => {
    const bg = i % 2 === 0 ? "#ffffff" : "#f9fafb";
    html += `
      <tr style="background:${bg}">
        <td style="padding:8px 14px;font-weight:600;color:#374151;width:40%;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:13px">${label}</td>
        <td style="padding:8px 14px;color:#1f2937;border-bottom:1px solid #f0f0f0;font-size:13px">${value}</td>
      </tr>
    `;
  });
  html += `</table>`;
  return html;
}

function buildEmailHtml(data: NotificationPayload): string {
  const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  const docLabel = formatDocumentLabel(data.type_document);

  // ── Identity section ──
  const identityRows: [string, string][] = [
    ["Nom", data.nom || "—"],
    ["Prenom", data.prenom || "—"],
    ["Email", data.email || "—"],
    ["Telephone", data.telephone || "—"],
  ];

  // ── Specific fields for dossier-bienvenue ──
  let dossierRows: [string, string][] = [];
  if (data.type_document === "dossier-bienvenue") {
    dossierRows = [
      ["N. Dossier CMA", data.numero_dossier_cma || "—"],
      ["Mot de passe CMA", data.mot_de_passe_cma || "—"],
      ["Type examen", data.type_examen || "—"],
      ["Date examen", data.date_examen || "—"],
      ["Lieu", data.lieu_examen || "—"],
      ["B2 vierge", data.b2_vierge ? "OUI" : "NON"],
    ];
  }

  // ── Donnees section (answers) ──
  let donneesRows: [string, string][] = [];
  if (data.donnees && data.type_document !== "dossier-bienvenue") {
    const skip = new Set(["_status", "_signed_by", "_signed_at", "_signature_image"]);
    for (const [key, value] of Object.entries(data.donnees)) {
      if (key.startsWith("_") || skip.has(key)) continue;
      donneesRows.push([formatFieldLabel(key), formatAnswerValue(value)]);
    }
  }

  // ── Metadata section ──
  const metaRows: [string, string][] = [
    ["Document", docLabel],
    ["Date de soumission", now],
  ];

  // ── Build full HTML ──
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docLabel}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          
          <!-- HEADER VIOLET FTRANSPORT -->
          <tr>
            <td style="background:linear-gradient(135deg,#6C3FA0 0%,#7C4FB0 50%,#8B5FC0 100%);padding:28px 32px;text-align:center">
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:1px">FTRANSPORT</h1>
              <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.85);letter-spacing:2px;text-transform:uppercase">Organisme de Formation</p>
            </td>
          </tr>

          <!-- DOCUMENT TITLE BAR -->
          <tr>
            <td style="background:#f0e6ff;padding:14px 32px;border-bottom:3px solid #6C3FA0">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:16px;font-weight:700;color:#4c1d95">📋 ${docLabel}</td>
                  <td style="text-align:right;font-size:12px;color:#7c3aed">${now}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:24px 32px 8px 32px">
              ${buildSection("Informations de l'apprenant", identityRows)}
              ${dossierRows.length > 0 ? buildSection("Details du dossier", dossierRows) : ""}
              ${donneesRows.length > 0 ? buildSection("Reponses et donnees du document", donneesRows) : ""}
              ${buildSection("Informations de soumission", metaRows)}
            </td>
          </tr>

          <!-- SEPARATOR -->
          <tr>
            <td style="padding:0 32px">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0">
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:20px 32px;background:#fafafa">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center">
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#6C3FA0">FTRANSPORT - Services Pro</p>
                    <p style="margin:0 0 2px;font-size:12px;color:#6b7280">86 Route de Genas, 69003 Lyon</p>
                    <p style="margin:0 0 2px;font-size:12px;color:#6b7280">Tel : 04 28 29 60 91</p>
                    <p style="margin:0 0 2px;font-size:12px;color:#6b7280">SIRET : 82346156100018 — NDA : 84 69 15114 69</p>
                    <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;font-style:italic">Email automatique envoye par la plateforme FTRANSPORT</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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
    const docLabel = formatDocumentLabel(payload.type_document);
    const subject = `[FTRANSPORT] ${docLabel} – ${payload.prenom || ""} ${(payload.nom || "").toUpperCase()}`;
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
        status: 200,
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
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
