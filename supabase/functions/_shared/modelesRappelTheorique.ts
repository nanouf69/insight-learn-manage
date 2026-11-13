/** Prepared content only, never invoked by a live sender. Proposed copy pending approval. */
export const OBJET_RAPPEL_THEORIQUE = "URGENT – Modules obligatoires à terminer avant la pratique";
export const MODELE_CPF_EXISTANT_ID = "relance_suspension_cpf";
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
  modeleExistantId?: typeof MODELE_CPF_EXISTANT_ID;
  sourceExistante?: string;
}
const conclusion: readonly ParagrapheRappel[] = [
  { texte: "En cas de difficulté technique ou de problème de validation d'un module, merci de contacter notre centre de formation." },
  { texte: "Cordialement, L'équipe Ftransport" },
];
export function modeleRappelTheorique(type: "ferme" | "obligations", avantExamen = false, financement?: FinancementRappelVerifie): ModeleRappelTheorique {
  const mentions = mentionsFinancement(financement);
  if (type === "obligations") return {
    type, objet: "", exigeValidationReglePratique: false, copieProposee: true,
    financementAVerifier: mentions.etat === "a_verifier",
    modeleExistantId: MODELE_CPF_EXISTANT_ID,
    sourceExistante: "supabase/functions/relance-suspension-cpf/index.ts",
    // Reference only: the existing sender owns the exact personalized subject and HTML.
    // Do not fabricate a second template or silently alter the existing content.
    paragraphes: [],
  };
  return {
    type, objet: avantExamen ? "Rappel important – Finalisez vos modules pour votre entraînement pratique" : OBJET_RAPPEL_THEORIQUE, exigeValidationReglePratique: true, copieProposee: true,
    paragraphes: [
      { texte: "Bonjour," },
      { texte: avantExamen
        ? "Votre examen théorique est prévu dans sept jours. Nous vous invitons à terminer l'ensemble des modules obligatoires de votre formation sur notre plateforme e-learning, à l'exception de la partie pratique et de l'entraînement pratique."
        : "À la suite de votre examen théorique, nous vous rappelons que vous devez impérativement terminer l'ensemble des modules de votre plateforme e-learning, à l'exception de la partie pratique." },
      { texte: avantExamen ? "Tant que vos modules obligatoires hors pratique ne sont pas terminés, vous ne pourrez pas passer à la partie pratique." : "ATTENTION : TANT QUE VOUS N'AVEZ PAS TERMINÉ TOUS VOS MODULES, VOUS NE POURREZ PAS PASSER À L'ENTRAÎNEMENT PRATIQUE.", avertissement: true },
      { texte: avantExamen ? "Si vos modules obligatoires hors pratique ne sont pas terminés, vous ne serez pas prioritaire pour le choix d'une date d'entraînement pratique." : "VOUS NE SEREZ PAS PRIORITAIRE POUR LE CHOIX D'UNE DATE D'ENTRAÎNEMENT PRATIQUE. PLUS VOUS TARDEZ À TERMINER VOS MODULES, PLUS VOUS RISQUEZ DE DEVOIR ATTENDRE POUR OBTENIR UNE DATE.", avertissement: true },
      { texte: avantExamen ? "Nous vous invitons à finaliser votre parcours dès que possible afin de bénéficier de cette priorité." : "Nous vous invitons à terminer vos modules dès maintenant afin de pouvoir accéder à l'entraînement pratique dans les meilleurs délais." },
      ...conclusion,
    ],
  };
}
/** Email-only semantic palette, shared by both prepared models. */
const EMAIL_AVERTISSEMENT = "#C62828";
const echapper = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
export function apercuHtmlRappel(modele: ModeleRappelTheorique): string | null {
  if (modele.modeleExistantId) return null;
  return modele.paragraphes.map(p => p.avertissement
    ? `<p><strong style="color:${EMAIL_AVERTISSEMENT};font-weight:700">${echapper(p.texte)}</strong></p>`
    : `<p>${echapper(p.texte)}</p>`).join("\n");
}
/** Plain-text alternative generated from the same paragraphs, never a separate copy. */
export function apercuTexteRappel(modele: ModeleRappelTheorique): string {
  return modele.paragraphes.map(p => p.texte).join("\n\n");
}