import { isElearningType } from "@/lib/dossierFormation";
import { isPresentielType } from "@/lib/agendaSlots";

export type ModeExamenBlanc = "presentiel" | "elearning" | "inconnu";

/**
 * Mode strict pour l'écran de confirmation d'identité avant un examen blanc.
 * Présentiel seulement si les deux règles existantes concordent ; tout cas
 * ambigu (vide, type inconnu, créneau en ligne) n'est jamais supposé présentiel.
 */
export function modeExamenBlancStrict(a: {
  type_apprenant?: string | null;
  formation_choisie?: string | null;
  creneau_horaire?: string | null;
} | null | undefined): ModeExamenBlanc {
  const type = String(a?.type_apprenant ?? "").trim().toLowerCase();
  const formation = String(a?.formation_choisie ?? "").trim().toLowerCase();
  if (!type && !formation) return "inconnu";
  if (isElearningType(type) || (!type && isElearningType(formation))) return "elearning";
  if (/e[-\s]?learning|en[-\s]?ligne|online|distanciel/.test(`${type} ${formation} ${a?.creneau_horaire ?? ""}`.toLowerCase())) return "elearning";
  const presentiel = isPresentielType(a?.type_apprenant, a?.formation_choisie, a?.creneau_horaire);
  const typeConnu = /^(vtc|taxi|ta|va)(-exam)?$|pr[eé]sentiel/.test(type);
  return presentiel && typeConnu ? "presentiel" : "inconnu";
}

/** L'écran s'affiche uniquement pour un NOUVEAU passage d'un élève présentiel (jamais en reprise ni pour l'admin). */
export function confirmationPresentielRequise(p: {
  mode: ModeExamenBlanc;
  passageMode: "resume" | "new";
  isAdmin?: boolean;
  dejaConfirme: boolean;
}): boolean {
  return !p.isAdmin && p.mode === "presentiel" && p.passageMode === "new" && !p.dejaConfirme;
}
