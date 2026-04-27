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
    "cgv-acceptation": "Conditions Générales de Vente – Acceptation",
    "cgv-ri-acceptation": "CGV et Règlement Intérieur – Signature",
    "evaluation-acquis": "Évaluation des acquis",
    "satisfaction": "Questionnaire de satisfaction",
  };
  return labels[type] || type;
}

function isFormationContinueVtcTaxi(payload: NotificationPayload): boolean {
  const serializedDonnees = JSON.stringify(payload.donnees || {}).toLowerCase();
  return (
    serializedDonnees.includes("continue-vtc") ||
    serializedDonnees.includes("continue-taxi") ||
    serializedDonnees.includes("formation-continue-vtc") ||
    serializedDonnees.includes("formation-continue-taxi")
  );
}

// ══════════════════════════════════════════════════════
// QUESTION LABELS PER DOCUMENT TYPE
// ══════════════════════════════════════════════════════

/** Analyse du besoin (logged-in form) */
const ANALYSE_BESOIN_LABELS: Record<string, string> = {
  nom: "Nom",
  prenom: "Prénom",
  email: "E-mail",
  telephone: "N° téléphone",
  adresse: "Adresse",
  codePostal: "Code postal",
  ville: "Ville",
  formationVTC: "Formation souhaitée : VTC (RS5637)",
  formationTAXI: "Formation souhaitée : TAXI (RS5635)",
  dateDocument: "Date du document",
  engagementAccepted: "Engagement signé",
  centreFormation: "Centre de formation (si formation TAXI déjà réalisée)",
  typeHandicap: "Type de handicap (précisions)",
  // Eligibility questions (e0..e4)
  e0: "Avez-vous déjà perdu 6 points d'un coup sur votre permis de conduire ?",
  e1: "Avez-vous déjà été condamné pour conduite d'un véhicule sans permis ?",
  e2: "Avez-vous été condamné pour refus de restitution du permis malgré son annulation, invalidation ou interdiction de l'obtenir ?",
  e3: "Avez-vous déjà été condamné à au moins 6 mois d'emprisonnement pour vol, escroquerie, abus de confiance, atteinte volontaire à l'intégrité de la personne, agression sexuelle ou infraction à la législation sur les stupéfiants ?",
  e4: "Avez-vous le casier judiciaire B3 vierge ?",
  // Complementary questions (c0..c1)
  c0: "Avez-vous déjà réalisé une formation TAXI (en initiale ou en continue) ?",
  c1: "Êtes-vous en situation de handicap ?",
};

/** Analyse du besoin (public pre-information QCM) */
const ANALYSE_PUBLIC_LABELS: Record<string, string> = {
  situation_actuelle: "Quelle est votre situation actuelle ?",
  niveau_etude: "Quel est votre niveau d'études ?",
  experience_transport: "Avez-vous une expérience dans le transport de personnes ?",
  type_experience: "Si oui, dans quel secteur ?",
  permis_conduire: "Depuis combien de temps avez-vous le permis B ?",
  motivation: "Quelle est votre principale motivation pour cette formation ?",
  disponibilite: "Quelles sont vos disponibilités pour suivre la formation ?",
  financement: "Quel mode de financement envisagez-vous ?",
  besoins_specifiques: "Avez-vous des besoins spécifiques ?",
  comment_connu: "Comment avez-vous connu FTRANSPORT ?",
  attentes: "Quelles sont vos principales attentes vis-à-vis de la formation ?",
  delai_formation: "Quand souhaitez-vous commencer la formation ?",
};

/** Projet professionnel (logged-in form) */
const PROJET_PRO_LABELS: Record<string, string> = {
  formType: "Type de formation",
  dateEntretien: "Date de l'entretien",
  conseiller: "Conseiller / Formateur",
  lieuNaissance: "Lieu de naissance",
  statutActuel: "Statut actuel",
  metierActuel: "Métier / Secteur actuel",
  anciennete: "Ancienneté dans le poste",
  niveauFormation: "Niveau de formation",
  motivations: "Pourquoi souhaitez-vous devenir conducteur ?",
  dejaTransport: "Avez-vous déjà exercé une activité de transport de personnes ?",
  detailTransport: "Précisions sur l'activité de transport",
  permis3ans: "Permis de conduire depuis plus de 3 ans ?",
  datePermis: "Date d'obtention du permis",
  // VTC
  modeExercice: "Mode d'exercice envisagé après la certification ?",
  plateformes: "Plateformes envisagées",
  // TAXI
  diffTaxiVtc: "Connaissez-vous la différence entre le taxi et le VTC ?",
  modeExerciceTaxi: "Mode d'exercice envisagé après l'obtention de la carte taxi ?",
  demandeADS: "Avez-vous envisagé de demander une ADS ?",
  zoneExercice: "Zone d'exercice envisagée ?",
  zoneAutre: "Zone d'exercice (précision)",
  activitesCompl: "Activités complémentaires au taxi ?",
  // Common
  demarchesEntreprise: "Démarches pour créer votre entreprise ?",
  craintes: "Principales craintes ou difficultés anticipées",
  commentConnu: "Comment avez-vous connu FTRANSPORT ?",
  consulteProgram: "Avez-vous consulté le programme de formation ?",
  saitExamen: "Savez-vous ce qu'implique l'examen ?",
  connaitZone: "Connaissez-vous bien la zone d'exercice ?",
  conduiteUrbaine: "Expérience de conduite en milieu urbain dense ?",
  connaitSites: "Connaissance des sites et bâtiments publics de Lyon ?",
  besoinsAdaptation: "Besoins d'adaptation pédagogique ?",
  accesOrdinateur: "Accès à un ordinateur ou tablette pour le e-learning ?",
  precisionsBesoins: "Précisions sur les besoins spécifiques",
  coherenceProjet: "Cohérence du projet professionnel (avis conseiller)",
  niveauMotivation: "Niveau de motivation perçu (avis conseiller)",
  observations: "Observations du conseiller",
  signatureAdmin: "Signature du conseiller / formateur",
};

/** Projet professionnel (public pre-information QCM) */
const PROJET_PUBLIC_LABELS: Record<string, string> = {
  objectif_court_terme: "Quel est votre objectif à court terme (6 mois) ?",
  objectif_moyen_terme: "Quel est votre objectif à moyen terme (1 à 3 ans) ?",
  type_activite: "Quel type d'activité envisagez-vous ?",
  zone_geographique: "Dans quelle zone géographique souhaitez-vous exercer ?",
  statut_juridique: "Quel statut juridique envisagez-vous ?",
  vehicule_prevu: "Avez-vous déjà prévu un véhicule pour votre activité ?",
  budget_investissement: "Quel est votre budget d'investissement estimé ?",
  date_debut_activite: "Quand souhaitez-vous démarrer votre activité professionnelle ?",
  connaissance_reglementation: "Connaissez-vous la réglementation du secteur ?",
  plateforme_envisagee: "Envisagez-vous de travailler avec une plateforme de mise en relation ?",
  accompagnement_souhaite: "Souhaitez-vous un accompagnement après la formation ?",
};

/** CGV */
const CGV_LABELS: Record<string, string> = {
  accepte: "J'accepte les Conditions Générales de Vente",
  dateAcceptation: "Date d'acceptation",
  signatureImage: "Signature",
};

/** CGV + RI */
const CGV_RI_LABELS: Record<string, string> = {
  cgv_accepte: "J'accepte les CGV",
  ri_accepte: "J'accepte le Règlement Intérieur",
  dateSignature: "Date de signature",
  nom: "Nom",
  prenom: "Prénom",
};

function getLabelsForDocument(typeDocument: string): Record<string, string> {
  switch (typeDocument) {
    case "analyse-besoin":
      return { ...ANALYSE_BESOIN_LABELS, ...ANALYSE_PUBLIC_LABELS };
    case "projet-professionnel":
      return { ...PROJET_PRO_LABELS, ...PROJET_PUBLIC_LABELS };
    case "cgv-acceptation":
      return CGV_LABELS;
    case "cgv-ri-acceptation":
      return CGV_RI_LABELS;
    default:
      return {};
  }
}

// ══════════════════════════════════════════════════════

function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "OUI ✅" : "NON ❌";
  if (typeof value === "string") return value || "—";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === "object" && v !== null) {
          return Object.entries(v)
            .map(([k, val]) => `${k}: ${val}`)
            .join(", ");
        }
        return String(v);
      })
      .join("<br>");
  }
  if (typeof value === "object") {
    // For objects like eligibility {e0: true, e1: false}, plateformes {Uber: true}
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([k]) => !k.startsWith("_")
    );
    if (entries.length === 0) return "—";
    // Check if it's a simple boolean map (like plateformes or eligibility)
    const allBooleans = entries.every(([, v]) => typeof v === "boolean" || v === null);
    if (allBooleans) {
      return entries
        .map(([k, v]) => {
          const display = v === true ? "OUI ✅" : v === false ? "NON ❌" : "—";
          return `${k} : ${display}`;
        })
        .join("<br>");
    }
    return entries
      .map(([k, v]) => `<strong>${k}:</strong> ${formatAnswerValue(v)}`)
      .join("<br>");
  }
  return String(value);
}

function resolveLabel(key: string, labels: Record<string, string>): string {
  if (labels[key]) return labels[key];
  // Fallback: humanize key
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build structured sections for eligibility/complementary nested objects */
function expandNestedAnswers(
  key: string,
  value: unknown,
  labels: Record<string, string>
): [string, string][] {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (key === "eligibility" || key === "complementary")
  ) {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.map(([subKey, subVal]) => [
      resolveLabel(subKey, labels),
      formatAnswerValue(subVal),
    ]);
  }
  return [[resolveLabel(key, labels), formatAnswerValue(value)]];
}

// ══════════════════════════════════════════════════════
// EVALUATION & SATISFACTION — structured rendering
// ══════════════════════════════════════════════════════

const NIVEAU_LABELS: Record<string, string> = {
  A: "A – Acquis ✅",
  B: "B – En cours 🔶",
  C: "C – Non acquis ❌",
  D: "D – Non évalué ⬜",
};

const SATISFACTION_NOTES: Record<string, string> = {
  "1": "😞 Très insatisfait",
  "2": "😕 Insatisfait",
  "3": "😐 Neutre",
  "4": "🙂 Satisfait",
  "5": "😊 Très satisfait",
};

function buildEvaluationSection(donnees: Record<string, unknown>): string {
  const parties = donnees.parties as Array<{
    titre: string;
    competences: Array<{ label: string; value: string | null; observation?: string }>;
  }>;
  if (!parties || !Array.isArray(parties)) return "";

  let html = "";
  for (const partie of parties) {
    const rows: [string, string][] = partie.competences.map((c) => [
      c.label,
      NIVEAU_LABELS[c.value || ""] || c.value || "—",
    ]);
    html += buildSection(partie.titre, rows);
  }
  if (donnees.commentaires && typeof donnees.commentaires === "string") {
    html += buildSection("Commentaires", [["Commentaires du formateur", donnees.commentaires as string]]);
  }
  return html;
}

function buildSatisfactionSection(donnees: Record<string, unknown>): string {
  const parties = donnees.parties as Array<{
    titre: string;
    criteres: Array<{ label: string; value: number | null }>;
  }>;
  if (!parties || !Array.isArray(parties)) return "";

  let html = "";
  for (const partie of parties) {
    const rows: [string, string][] = partie.criteres.map((c) => [
      c.label,
      c.value !== null ? (SATISFACTION_NOTES[String(c.value)] || `${c.value}/5`) : "—",
    ]);
    html += buildSection(partie.titre, rows);
  }
  // Extra fields
  const extras: [string, string][] = [];
  if (donnees.noteGlobale !== undefined && donnees.noteGlobale !== null) {
    extras.push(["Note globale de satisfaction", `${"⭐".repeat(donnees.noteGlobale as number)} (${donnees.noteGlobale}/5)`]);
  }
  if (donnees.pointsForts) extras.push(["Points forts de la formation", donnees.pointsForts as string]);
  if (donnees.pointsAmeliorer) extras.push(["Points à améliorer", donnees.pointsAmeliorer as string]);
  if (donnees.suggestions) extras.push(["Suggestions", donnees.suggestions as string]);
  if (extras.length > 0) html += buildSection("Avis global et commentaires", extras);
  return html;
}

// ══════════════════════════════════════════════════════
// HTML BUILDER
// ══════════════════════════════════════════════════════

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
        <td style="padding:10px 14px;font-weight:600;color:#374151;width:45%;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:13px">${label}</td>
        <td style="padding:10px 14px;color:#1f2937;border-bottom:1px solid #f0f0f0;font-size:13px">${value}</td>
      </tr>
    `;
  });
  html += `</table>`;
  return html;
}

function buildEmailHtml(data: NotificationPayload): string {
  const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  const docLabel = formatDocumentLabel(data.type_document);
  const labels = getLabelsForDocument(data.type_document);

  // ── Identity section ──
  const identityRows: [string, string][] = [
    ["Nom", data.nom || "—"],
    ["Prénom", data.prenom || "—"],
    ["E-mail", data.email || "—"],
    ["Téléphone", data.telephone || "—"],
  ];

  // ── Dossier bienvenue specific ──
  let dossierRows: [string, string][] = [];
  if (data.type_document === "dossier-bienvenue") {
    dossierRows = [
      ["N° Dossier CMA", data.numero_dossier_cma || "—"],
      ["Mot de passe CMA", data.mot_de_passe_cma || "—"],
      ["Type examen", data.type_examen || "—"],
      ["Date examen", data.date_examen || "—"],
      ["Lieu", data.lieu_examen || "—"],
      ["B2 vierge", data.b2_vierge ? "OUI ✅" : "NON ❌"],
    ];
  }

  // ── Donnees section (answers with real questions) ──
  let donneesHtml = "";
  if (data.donnees && data.type_document !== "dossier-bienvenue") {
    const skip = new Set(["_status", "_signed_by", "_signed_at", "_signature_image", "signature"]);

    // Special handling for evaluation-acquis and satisfaction
    if (data.type_document === "evaluation-acquis") {
      donneesHtml = buildEvaluationSection(data.donnees);
    } else if (data.type_document === "satisfaction") {
      donneesHtml = buildSatisfactionSection(data.donnees);
    } else {
      // Generic: build rows with proper question labels
      const donneesRows: [string, string][] = [];
      for (const [key, value] of Object.entries(data.donnees)) {
        if (key.startsWith("_") || skip.has(key)) continue;
        // Expand nested objects (eligibility, complementary)
        const expanded = expandNestedAnswers(key, value, labels);
        donneesRows.push(...expanded);
      }
      if (donneesRows.length > 0) {
        donneesHtml = buildSection("Réponses du formulaire", donneesRows);
      }
    }
  }

  // ── Metadata section ──
  const metaRows: [string, string][] = [
    ["Document", docLabel],
    ["Date de soumission", now],
  ];

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
              ${dossierRows.length > 0 ? buildSection("Détails du dossier", dossierRows) : ""}
              ${donneesHtml}
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
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#6C3FA0">FTRANSPORT – Services Pro</p>
                    <p style="margin:0 0 2px;font-size:12px;color:#6b7280">86 Route de Genas, 69003 Lyon</p>
                    <p style="margin:0 0 2px;font-size:12px;color:#6b7280">Tél : 04 28 29 60 91</p>
                    <p style="margin:0 0 2px;font-size:12px;color:#6b7280">SIRET : 82346156100018 — NDA : 84 69 15114 69</p>
                    <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;font-style:italic">Email automatique envoyé par la plateforme FTRANSPORT</p>
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
    if (["analyse-besoin", "projet-professionnel", "test-competences"].includes(payload.type_document) && isFormationContinueVtcTaxi(payload)) {
      console.log("Notification skipped for formation continue VTC/TAXI:", payload.type_document);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
