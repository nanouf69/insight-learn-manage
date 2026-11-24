export const COMPETENCES_MODELE = "justification_competences_intervenant";
export const COMPETENCES_VERSION = "services-pro-competences-2026-11-24-v1";
export const DECLARATION_COMPETENCES = "Je certifie l’exactitude des informations et des justificatifs que je fournis. Les expériences et qualifications indiquées correspondent à ma situation réelle. Je distingue les diplômes et certifications obtenus des formations suivies sans certification. Je m’engage à signaler toute information devenue inexacte. Cette déclaration ne vaut pas validation des compétences par SERVICES PRO ; le responsable examine séparément leur adéquation aux missions confiées.";
export const COMPETENCES_CHAMPS = [
  { id: "missions", label: "Missions réalisées ou envisagées pour SERVICES PRO, matières, publics, dates et modalités" },
  { id: "experience", label: "Expérience professionnelle et pédagogique : fonctions, organismes et périodes" },
  { id: "diplomes", label: "Diplômes et certifications obtenus : intitulés exacts, organismes et dates" },
  { id: "cv", label: "CV : parcours détaillé et justificatif joint" },
  { id: "justificatifs", label: "Autres justificatifs et précisions sur les compétences mobilisées" },
] as const;

export const COMPETENCES_MAX_FILE_SIZE = 4 * 1024 * 1024;
export const COMPETENCES_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"];
export function validerCompetences(reponses: Record<string, unknown>, declaration: unknown) {
  if (declaration !== true) return "La déclaration exacte doit être acceptée.";
  for (const champ of COMPETENCES_CHAMPS) {
    const value = reponses[champ.id];
    if (typeof value !== "string" || !value.trim() || value.length > 12_000) return `Champ requis ou trop long : ${champ.label}`;
  }
  return null;
}
export function validerJustificatif(file: { size: number; type: string }) {
  return file.size > 0 && file.size <= COMPETENCES_MAX_FILE_SIZE && COMPETENCES_FILE_TYPES.includes(file.type);
}