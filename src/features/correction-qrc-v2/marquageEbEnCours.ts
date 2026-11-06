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

// Critère « dernier EB réalisé » : dans la session CRM en cours sélectionnée,
// seul(s) l'EB (ou les EB à égalité exacte) dont le passage le plus récent
// (jour + heure réels du passage) est le plus tardif est marqué. Jamais le numéro d'EB.
export interface EbDate { jour: string; heureMax: string }
export interface EbMarquable { cle: string; dates: EbDate[] }

const instantMax = (e: EbMarquable) =>
  e.dates.reduce((m, d) => { const k = `${d.jour}T${d.heureMax}`; return k > m ? k : m; }, "");

export function ebsLesPlusRecents(
  g: GroupeMarquable | null | undefined, examens: EbMarquable[], jourParis: string,
): Set<string> {
  if (!groupeEnCours(g, jourParis) || examens.length === 0) return new Set();
  const max = examens.reduce((m, e) => { const k = instantMax(e); return k > m ? k : m; }, "");
  if (!max) return new Set();
  return new Set(examens.filter((e) => instantMax(e) === max).map((e) => e.cle));
}
