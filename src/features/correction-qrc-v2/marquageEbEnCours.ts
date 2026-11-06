// Marquage « session en cours » des entrées du menu des examens blancs.
// Un EB est marqué seulement si TOUS ses passages viennent d'une session CRM
// unique (groupe de type "crm") dont la période réelle contient aujourd'hui (Paris).
// Groupes « sans session déterminée » ou « sessions qui se chevauchent » : jamais marqués.
export interface GroupeMarquable { type: string; debut?: string | null; fin?: string | null }

export function groupeEnCours(g: GroupeMarquable | null | undefined, jourParis: string): boolean {
  return !!g && g.type === "crm" && !!g.debut && !!g.fin && jourParis >= g.debut && jourParis <= g.fin;
}

export const PREFIXE_EN_COURS = "🔴 EN COURS — ";

export function prefixeEb(g: GroupeMarquable | null | undefined, jourParis: string): string {
  return groupeEnCours(g, jourParis) ? PREFIXE_EN_COURS : "";
}
