/** Texte du modèle ; tout champ manquant est signalé, jamais inventé. */
export const ORGANISME = { raisonSociale: "Ftransport", adresse: "86 Route de Genas 69003 Lyon", nda: "11770762377", ville: "Lyon" } as const;
export const VERSION_MODELE = "attestation-fin-validee-v1";
export interface ChampsAttestation {
  representant: string | null; nom: string | null; prenom: string | null; formation: string | null;
  modalite: string | null; dateDebut: string | null; dateFin: string | null; dureeHeures: number | null; dateEmission: string;
}
const fr = (d: string) => d.slice(0, 10).split("-").reverse().join("/");
export function champsManquants(c: ChampsAttestation): string[] {
  const m: string[] = [];
  if (!c.representant?.trim()) m.push("représentant du centre");
  if (!c.nom?.trim() || !c.prenom?.trim()) m.push("nom et prénom");
  if (!c.formation?.trim()) m.push("intitulé de formation");
  if (!c.modalite?.trim()) m.push("modalité");
  if (!c.dateDebut || !c.dateFin) m.push("dates de formation");
  else if (c.dateDebut > c.dateFin) m.push("dates incohérentes");
  if (typeof c.dureeHeures !== "number" || !(c.dureeHeures > 0)) m.push("durée");
  return m;
}
export function texteAttestation(c: ChampsAttestation): string[] | null {
  if (champsManquants(c).length) return null;
  return [
    "ATTESTATION DE FIN DE FORMATION",
    `Organisme : ${ORGANISME.raisonSociale} — ${ORGANISME.adresse} — N° de déclaration d'activité : ${ORGANISME.nda}`,
    `Je soussigné(e) ${c.representant}, atteste que ${c.prenom} ${String(c.nom).toUpperCase()}, inscrit(e) à la formation ${c.formation}, en modalité ${c.modalite}, du ${fr(c.dateDebut!)} au ${fr(c.dateFin!)}, d'une durée de ${c.dureeHeures} heures, a suivi et achevé l'ensemble des modules obligatoires prévus dans son parcours.`,
    "Après vérification des éléments de suivi pédagogique : réalisation de tous les modules obligatoires, validation de tous les jalons requis, enregistrement des activités et évaluations obligatoires, achèvement conforme aux règles.",
    "Statut : FORMATION TERMINÉE ET VALIDÉE.",
    "Cette attestation ne vaut pas réussite à l'examen professionnel.",
    `Fait à ${ORGANISME.ville}, le ${fr(c.dateEmission)}.`,
  ];
}
/** Empreinte SHA-256 du contenu exact + version : la signature porte sur ce texte précis. */
export async function empreinteAttestation(lignes: string[], apprenantId: string): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify({ v: VERSION_MODELE, apprenantId, lignes }));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export const referenceAttestation = (empreinte: string, dateEmission: string) => `AFF-${dateEmission.slice(0, 10).replace(/-/g, "")}-${empreinte.slice(0, 10).toUpperCase()}`;
