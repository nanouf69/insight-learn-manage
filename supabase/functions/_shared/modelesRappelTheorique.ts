/** Prepared content only, never invoked by a live sender. Proposed copy pending approval. */
export const OBJET_RAPPEL_THEORIQUE = "URGENT – Modules obligatoires à terminer avant la pratique";
export const MODELE_CPF_EXISTANT_ID = "relance_suspension_cpf";
export const CAMPAGNE_CONNECTES_ID = "rappel_modules_connectes_theorique";
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
  campagneId: typeof CAMPAGNE_CONNECTES_ID;
}
const conclusion: readonly ParagrapheRappel[] = [
  { texte: "En cas de difficulté technique ou de problème de validation d'un module, merci de contacter notre centre de formation." },
  { texte: "Cordialement, L'équipe Ftransport" },
];
export function modeleRappelTheorique(type: "ferme" | "obligations", avantExamen = false, financement?: FinancementRappelVerifie, prioriteEffective = false): ModeleRappelTheorique {
  const mentions = mentionsFinancement(financement);
  const consequences: ParagrapheRappel[] = [];
  if (mentions.cpf) consequences.push({ texte: "Le non-respect de vos obligations de formation peut avoir des conséquences sur votre dossier de financement CPF, après examen de votre situation par les organismes compétents." });
  if (mentions.franceTravail) consequences.push({ texte: "Si cette formation fait partie de vos engagements auprès de France Travail, le non-respect de ces engagements peut entraîner des conséquences administratives, après examen de votre situation par France Travail." });
  if (consequences.length) consequences.push({ texte: "Un simple retard n'entraîne pas automatiquement de sanction. Seuls les organismes compétents peuvent décider, après examen de votre situation." });
  if (type === "obligations") return {
    type, objet: "IMPORTANT – Modules de formation non terminés : rappel de vos obligations", exigeValidationReglePratique: false, copieProposee: true,
    campagneId: CAMPAGNE_CONNECTES_ID,
    financementAVerifier: mentions.etat === "a_verifier",
    paragraphes: [
      { texte: "Bonjour," },
      { texte: "Vous avez déjà accédé à notre plateforme, mais certains modules obligatoires de votre formation restent à terminer, à l'exception de la partie pratique." },
      { texte: "Nous vous rappelons que vous devez suivre et réaliser les activités pédagogiques prévues dans votre parcours de formation, en tenant compte de vos dispenses." },
      ...consequences,
      { texte: "Nous vous invitons à finaliser les modules encore en attente. En cas de difficulté technique ou de problème de validation, contactez notre centre afin que nous puissions examiner votre situation." },
      { texte: "Cordialement, L'équipe Ftransport" },
    ],
  };
  return {
    type, objet: avantExamen ? "Rappel important – Finalisez vos modules pour votre entraînement pratique" : OBJET_RAPPEL_THEORIQUE, exigeValidationReglePratique: false, copieProposee: true,
    campagneId: CAMPAGNE_CONNECTES_ID,
    paragraphes: [
      { texte: "Bonjour," },
      { texte: avantExamen
        ? "Votre examen théorique est prévu dans sept jours. Nous vous invitons à terminer l'ensemble des modules obligatoires de votre formation sur notre plateforme e-learning, à l'exception de la partie pratique et de l'entraînement pratique."
        : "À la suite de votre examen théorique, nous vous rappelons que vous devez impérativement terminer l'ensemble des modules de votre plateforme e-learning, à l'exception de la partie pratique." },
      { texte: "ATTENTION : TERMINEZ TOUS VOS MODULES OBLIGATOIRES HORS PRATIQUE. EN CAS DE PROBLÈME DE VALIDATION, CONTACTEZ NOTRE CENTRE.", avertissement: true },
      { texte: prioriteEffective
        ? "VOUS NE SEREZ PAS PRIORITAIRE POUR LE CHOIX D'UNE DATE D'ENTRAÎNEMENT PRATIQUE TANT QUE CES MODULES RESTENT INCOMPLETS. LES PLACES DISPONIBLES ET LES ENGAGEMENTS CONTRACTUELS RESTENT PRIS EN COMPTE."
        : "LE CHOIX D'UNE DATE D'ENTRAÎNEMENT PRATIQUE DÉPEND DES PLACES DISPONIBLES ET DES ENGAGEMENTS CONTRACTUELS. VOTRE RÉSERVATION EXISTANTE RESTE INCHANGÉE.", avertissement: true },
      { texte: "Nous vous invitons à terminer vos modules dès maintenant. Ce rappel ne constitue pas une interdiction de réserver un entraînement pratique." },
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