/** Prepared content only, never invoked by a live sender. Proposed copy pending approval. */
export const OBJET_RAPPEL_THEORIQUE = "Rappel important – Finalisez vos modules pour votre entraînement pratique";
export interface ParagrapheRappel { texte: string; avertissement?: boolean }
export interface ModeleRappelTheorique {
  type: "ferme" | "normal";
  objet: string;
  paragraphes: readonly ParagrapheRappel[];
  /** Prevent an unimplemented or contractually unsupported restriction being sent as a fact. */
  exigeValidationReglePratique: boolean;
  copieProposee: true;
}
const conclusion: readonly ParagrapheRappel[] = [
  { texte: "En cas de difficulté technique ou de problème de validation d'un module, merci de contacter notre centre de formation." },
  { texte: "Cordialement, L'équipe Ftransport" },
];
export function modeleRappelTheorique(type: "ferme" | "normal", avantExamen = false): ModeleRappelTheorique {
  if (type === "normal") return {
    type, objet: OBJET_RAPPEL_THEORIQUE, exigeValidationReglePratique: false, copieProposee: true,
    paragraphes: [
      { texte: "Bonjour," },
      { texte: "À la suite de votre examen théorique, nous vous rappelons de terminer l'ensemble des modules obligatoires de votre formation sur notre plateforme e-learning, à l'exception de la partie pratique et de l'entraînement pratique." },
      { texte: "Nous vous invitons à vérifier votre progression et à finaliser les modules encore en attente." },
      ...conclusion,
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