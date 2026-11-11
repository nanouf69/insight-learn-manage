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

// Latest recorded EB per proven track in the current CRM session, not one global winner.
// Unknown exam identities never supply an inferred track; future/out-of-session days are excluded.
export interface EbDate { jour: string; heureMax: string }
export interface EbMarquable { cle: string; exam_id?: string; dates: EbDate[] }

const filiere = (e: EbMarquable) => {
  const id=e.exam_id??e.cle.split('::').at(-1)??'';
  const match=/^eb[1-6](?:-(taxi|ta|va))?$/i.exec(id);
  return match?(match[1]??'VTC').toUpperCase():null;
};

export function ebsLesPlusRecents(
  g: GroupeMarquable | null | undefined, examens: EbMarquable[], jourParis: string,
): Set<string> {
  if (!groupeEnCours(g, jourParis) || examens.length === 0) return new Set();
  const candidats=examens.map(e=>({e,filiere:filiere(e),instant:e.dates.filter(d=>d.jour>=(g?.debut??'')&&d.jour<=(g?.fin??'')&&d.jour<=jourParis).reduce((m,d)=>{const k=`${d.jour}T${d.heureMax}`;return k>m?k:m;},'')}));
  const maxima=new Map<string,string>();
  for(const c of candidats)if(c.filiere&&c.instant&&c.instant>(maxima.get(c.filiere)??''))maxima.set(c.filiere,c.instant);
  return new Set(candidats.filter(c=>c.filiere&&c.instant&&c.instant===maxima.get(c.filiere)).map(c=>c.e.cle));
}
