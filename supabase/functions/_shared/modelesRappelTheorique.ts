/** Prepared content only, never invoked by a live sender. Proposed copy pending approval. */
export const OBJET_RAPPEL_THEORIQUE = "Rappel important – Finalisez vos modules pour votre entraînement pratique";
export const OBJET_RAPPEL_OBLIGATIONS = "IMPORTANT – Modules de formation non terminés : rappel de vos obligations";
/** Verified dossier-specific financing and training commitments, never inferred from unemployment registration alone. */
export interface FinancementRappelVerifie { cpf: boolean | null; engagementsFranceTravail: boolean | null }
export function mentionsFinancement(financement?: FinancementRappelVerifie): { etat: "verifie" | "a_verifier"; cpf: boolean; franceTravail: boolean } {
  if (!financement || financement.cpf === null || financement.engagementsFranceTravail === null) {
    return { etat: "a_verifier", cpf: false, franceTravail: false };
  }
  return { etat: "verifie", cpf: financement.cpf, franceTravail: financement.engagementsFranceTravail };
}
export interface ParagrapheRappel { texte: string; avertissement?: boolean }
export interface ModeleRappelTheorique {
  type: "ferme" | "obligations";
  objet: string;
  paragraphes: readonly ParagrapheRappel[];
  /** Prevent an unimplemented or contractually unsupported restriction being sent as a fact. */
  exigeValidationReglePratique: boolean;
  copieProposee: true;
  financementAVerifier?: boolean;
}
const conclusion: readonly ParagrapheRappel[] = [
  { texte: "En cas de difficulté technique ou de problème de validation d'un module, merci de contacter notre centre de formation." },
  { texte: "Cordialement, L'équipe Ftransport" },
];
export function modeleRappelTheorique(type: "ferme" | "obligations", avantExamen = false, financement?: FinancementRappelVerifie): ModeleRappelTheorique {
  const mentions = mentionsFinancement(financement);
  const consequence = mentions.cpf && mentions.franceTravail
    ? "ATTENTION : Le non-respect de vos obligations de formation peut entraîner des conséquences sur votre dossier de financement CPF et, si votre formation est suivie dans le cadre de vos engagements auprès de France Travail, des sanctions administratives, après examen de votre situation par les organismes compétents."
    : mentions.cpf
      ? "ATTENTION : Le non-respect de vos obligations de formation peut entraîner des conséquences sur votre dossier de financement CPF, après examen de votre situation par les organismes compétents."
      : mentions.franceTravail
        ? "ATTENTION : Si votre formation est suivie dans le cadre de vos engagements auprès de France Travail, le non-respect de vos obligations de formation peut entraîner des sanctions administratives, après examen de votre situation par les organismes compétents."
        : null;
  if (type === "obligations") return {
    type, objet: OBJET_RAPPEL_OBLIGATIONS, exigeValidationReglePratique: false, copieProposee: true,
    financementAVerifier: mentions.etat === "a_verifier",
    paragraphes: [
      { texte: "Bonjour," },
      { texte: "Nous constatons que vous n'avez pas encore terminé l'ensemble des modules obligatoires de votre formation sur notre plateforme e-learning, à l'exception de la partie pratique." },
      { texte: "Nous vous rappelons que vous devez suivre et réaliser les activités pédagogiques prévues dans votre parcours de formation." },
      ...(consequence ? [{ texte: consequence }] : []),
      ...(consequence ? [{ texte: "Un simple retard ne signifie pas qu'une sanction sera appliquée. Aucune sanction n'est automatique ; seuls les organismes compétents peuvent décider après examen de votre situation." }] : []),
      { texte: "Nous vous invitons à terminer rapidement vos modules afin de régulariser votre situation." },
      { texte: "En cas de difficulté technique ou de problème de validation, contactez immédiatement notre centre de formation afin que nous puissions examiner votre situation." },
      { texte: "Cordialement, L'équipe Ftransport." },
    ],
  };
  return {
    type, objet: OBJET_RAPPEL_THEORIQUE, exigeValidationReglePratique: true, copieProposee: true,
    paragraphes: [
      { texte: "Bonjour," },
      { texte: avantExamen
        ? "Votre examen théorique est prévu dans sept jours. Nous vous invitons à terminer l'ensemble des modules obligatoires de votre formation sur notre plateforme e-learning, à l'exception de la partie pratique et de l'entraînement pratique."
        : "À la suite de votre examen théorique, nous vous invitons à terminer l'ensemble des modules obligatoires de votre formation sur notre plateforme e-learning, à l'exception de la partie pratique et de l'entraînement pratique." },
      { texte: "Tant que vos modules obligatoires hors pratique ne sont pas terminés, vous ne pourrez pas passer à la partie pratique.", avertissement: true },
      { texte: "Si vos modules obligatoires hors pratique ne sont pas terminés, vous ne serez pas prioritaire pour le choix d'une date d'entraînement pratique.", avertissement: true },
      { texte: "Nous vous invitons à finaliser votre parcours dès que possible afin de bénéficier de cette priorité." },
      ...conclusion,
    ],
  };
}
/** Email-only semantic palette, shared by both prepared models. */
const EMAIL_AVERTISSEMENT = "#b91c1c";
const echapper = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
export function apercuHtmlRappel(modele: ModeleRappelTheorique): string {
  return modele.paragraphes.map(p => p.avertissement
    ? `<p><strong style="color:${EMAIL_AVERTISSEMENT}">${echapper(p.texte)}</strong></p>`
    : `<p>${echapper(p.texte)}</p>`).join("\n");
}