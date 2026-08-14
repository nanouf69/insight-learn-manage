import { supabase } from "@/integrations/supabase/client";

const ONBOARDING_URL = "https://insight-learn-manage.lovable.app/bienvenue";

export const isFormationContinueVtcTaxi = (...values: Array<string | null | undefined>) =>
  values.some((value) => {
    const normalized = (value || "").toLowerCase();
    return (
      normalized.includes("continue-vtc") ||
      normalized.includes("continue-taxi") ||
      normalized.includes("formation-continue-vtc") ||
      normalized.includes("formation-continue-taxi")
    );
  });

const FORMATION_LABELS: Record<string, string> = {
  vtc: "VTC",
  "vtc-e": "VTC (E-learning)",
  "vtc-e-presentiel": "VTC (E-learning + Présentiel)",
  taxi: "TAXI",
  "taxi-e": "TAXI (E-learning)",
  "taxi-e-presentiel": "TAXI (E-learning + Présentiel)",
  ta: "Passerelle TA (VTC→TAXI)",
  "ta-e": "Passerelle TA (E-learning)",
  "ta-e-presentiel": "Passerelle TA (E-learning + Présentiel)",
  va: "Passerelle VA (TAXI→VTC)",
  "va-e": "Passerelle VA (E-learning)",
  "va-e-presentiel": "Passerelle VA (E-learning + Présentiel)",
};

export interface InscriptionEmailParams {
  apprenantId: string;
  prenom: string;
  nom: string;
  email: string;
  /** ex: "vtc-e", "taxi", "ta-e-presentiel" */
  typeApprenant: string | null;
  formationChoisie: string | null;
  dateDebutFormation?: string | null;
}

export interface InscriptionEmailResult {
  preInfoSent: boolean;
  bienvenueSent: boolean;
}

/**
 * Envoie la lettre de pré-information + le dossier de bienvenue.
 * Utilisé aussi bien pour une inscription manuelle que pour un import tableur (Excel/CSV).
 */
export async function sendInscriptionEmails({
  apprenantId,
  prenom,
  nom,
  email,
  typeApprenant,
  formationChoisie,
  dateDebutFormation,
}: InscriptionEmailParams): Promise<InscriptionEmailResult> {
  const result: InscriptionEmailResult = { preInfoSent: false, bienvenueSent: false };
  if (!email) return result;

  const rawType = (typeApprenant || "").toLowerCase().split(" + ")[0].trim();
  const baseType = rawType.replace(/-e-presentiel$/, "").replace(/-e$/, "");
  const preInfoType = ["vtc", "taxi", "ta", "va"].includes(baseType) ? baseType : null;
  const formationLabel = FORMATION_LABELS[rawType] || (rawType ? rawType.toUpperCase() : "votre formation");
  const isFC = isFormationContinueVtcTaxi(formationChoisie, typeApprenant);

  // 1) Lettre de pré-information (jamais pour la formation continue VTC/TAXI)
  if (preInfoType && !isFC) {
    try {
      const { data: tpl } = await supabase
        .from("email_templates")
        .select("subject_template, body_template")
        .eq("id", `pre-information-${preInfoType}-sans-date`)
        .single();

      if (tpl) {
        const vars: Record<string, string> = {
          "{{prenom}}": prenom,
          "{{nom}}": nom,
          "{{email}}": email,
          "{{apprenant_id}}": apprenantId,
          "{{formation}}": formationChoisie || "",
          "{{date_debut}}": dateDebutFormation || "",
        };
        let subject = tpl.subject_template;
        let body = tpl.body_template;
        for (const [key, val] of Object.entries(vars)) {
          subject = subject.split(key).join(val);
          body = body.split(key).join(val);
        }
        await supabase.functions.invoke("sync-outlook-emails", {
          body: { action: "send", apprenantId, userEmail: "contact@ftransport.fr", to: email, subject, body },
        });
        result.preInfoSent = true;
      }
    } catch (err) {
      console.error("Erreur envoi email pré-information:", err);
    }
  }

  // 2) Dossier de bienvenue (onboarding)
  try {
    const subject = `Bienvenue chez Ftransport - ${prenom} ${nom}`;
    const body = `<p>Bonjour ${prenom} ${nom},</p>
<p>Nous avons le plaisir de vous confirmer votre inscription à la formation <strong>${formationLabel}</strong>.</p>
<p>🚨 <strong style="color: #dc2626;">IMPORTANT : Afin de valider définitivement votre inscription à l'examen, merci de cliquer sur le lien ci-dessous et de suivre les étapes. Sans cela, vous ne serez pas inscrit à l'examen.</strong></p>
<p>👉 <strong><a href="${ONBOARDING_URL}">CLIQUEZ ICI POUR COMPLÉTER VOTRE DOSSIER D'INSCRIPTION</a></strong></p>
<p>⚠️ <strong>Ce dossier est OBLIGATOIRE. Sans celui-ci complété, vous ne pourrez pas effectuer votre formation.</strong></p>
<p>Pour toute question :<br>📞 04 28 29 60 91<br>📧 contact@ftransport.fr</p>
<p>Cordialement,<br><strong>L'équipe Ftransport</strong><br>86 Route de Genas, 69003 Lyon</p>`;

    await supabase.functions.invoke("sync-outlook-emails", {
      body: { action: "send", apprenantId, userEmail: "contact@ftransport.fr", to: email, subject, body },
    });
    result.bienvenueSent = true;
  } catch (err) {
    console.error("Erreur envoi email bienvenue:", err);
  }

  return result;
}
