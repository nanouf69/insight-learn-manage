/**
 * Polices d'assurance par véhicule ET version de police (données dictées par l'utilisateur le 12/11/2026,
 * PDF originaux NON encore téléversés dans le projet). Une police n'est jamais réutilisée pour un autre véhicule.
 */
import { assuranceVide, type AssuranceLocation } from "./contratLocationClauses";

export interface PoliceVehicule {
  cle: string; immatriculation: string; vehicule: string; assureur: string; agent: string;
  numeroPolice: string; contrat: string; versionCp: string; attestationDu: string;
  validiteDebut: string; validiteFin: string; usageDeclare: string;
  garanties: { libelle: string; souscrite: boolean | "legale"; franchise: string; plafond?: string }[];
  documentsReferencesAbsents: string[]; piecesOriginalesTeleversees: boolean;
  /** Statut de l'usage location : jamais « autorisé » sans confirmation écrite de l'assureur. */
  usageLocation: "a_confirmer_par_ecrit";
}

export const POLICES: PoliceVehicule[] = [{
  cle: "axa-10832847704-cp-2026-07-30", immatriculation: "HK-870-BF", vehicule: "KIA Sportage V 1.6 T-GDI 245 PHEV A (1re circulation 03/2026)",
  assureur: "AXA (agent Olivier HEIM)", agent: "Olivier HEIM", numeroPolice: "10832847704", contrat: "0000010832847704",
  versionCp: "Conditions particulières Automobile Entreprise, effet 30/07/2026 (14 pages)", attestationDu: "2026-08-21",
  validiteDebut: "2026-05-01", validiteFin: "2027-04-30",
  usageDeclare: "Auto-école ; aucun transport onéreux de personnes ou de marchandises ; conduite élève sous la garde du moniteur",
  garanties: [
    { libelle: "Responsabilité civile automobile", souscrite: true, franchise: "Sans franchise", plafond: "Corporels illimités ; matériels et immatériels consécutifs 100 000 000 €" },
    { libelle: "RC fonctionnement", souscrite: true, franchise: "500 €" },
    { libelle: "RC atteintes à l'environnement", souscrite: true, franchise: "1 500 €" },
    { libelle: "Dommages accidentels", souscrite: true, franchise: "700 €" },
    { libelle: "Incendie, explosion, attentats, grêle, tempête", souscrite: true, franchise: "700 €" },
    { libelle: "Vol", souscrite: true, franchise: "700 €" },
    { libelle: "Bris de glace", souscrite: true, franchise: "100 €" },
    { libelle: "Catastrophes naturelles", souscrite: "legale", franchise: "Franchise légale" },
    { libelle: "Assistance technique", souscrite: true, franchise: "Selon annexe 460.003E (non fournie)" },
    { libelle: "Remorquage", souscrite: false, franchise: "—" },
    { libelle: "Véhicule de remplacement", souscrite: false, franchise: "—" },
    { libelle: "Protection juridique option 1", souscrite: true, franchise: "Selon CG 460.004C (non fournies)", plafond: "10 000 €" },
    { libelle: "Pertes financières", souscrite: false, franchise: "—" },
  ],
  documentsReferencesAbsents: ["Conditions générales Atouts Parc n°460.002I", "Annexe Assistance 460.003E", "Protection juridique 460.004C", "Clause bonus-malus 460.005A"],
  piecesOriginalesTeleversees: false,
  usageLocation: "a_confirmer_par_ecrit",
}];

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
/** Police uniquement si l'immatriculation correspond exactement ; sinon null (ex. Sharan). */
export function policePourVehicule(immatriculation: string): PoliceVehicule | null {
  const i = norm(immatriculation);
  return i ? POLICES.find(p => norm(p.immatriculation) === i) ?? null : null;
}

export const STATUT_LOCATION_NON_AUTORISEE = "Location non autorisée tant que la confirmation écrite d'AXA n'est pas reçue";

export interface PerimetreValide {
  confirmationAssureurRecue: boolean; referenceConfirmation: string;
  avecMoniteur: boolean | null; formation: boolean | null; usageProfessionnel: boolean | null; locationPayante: boolean | null;
  /** Accord ORAL déclaré par le loueur (jamais assimilé à une confirmation écrite). */
  accordOralDeclare: boolean; dateAccordOral: string; interlocuteurAccordOral: string;
}
export const perimetreVide = (): PerimetreValide => ({ accordOralDeclare: false, dateAccordOral: "", interlocuteurAccordOral: "", confirmationAssureurRecue: false, referenceConfirmation: "", avecMoniteur: null, formation: null, usageProfessionnel: null, locationPayante: null });

/** Blocages propres à la police du véhicule (en plus de l'annexe générale). */
export function blocagesPolice(p: PoliceVehicule | null, perimetre: PerimetreValide): string[] {
  if (!p) return ["Aucune police enregistrée pour ce véhicule : la police du KIA ne peut pas être réutilisée"];
  const b: string[] = [];
  if (!perimetre.confirmationAssureurRecue || !perimetre.referenceConfirmation.trim()) b.push(STATUT_LOCATION_NON_AUTORISEE);
  if (perimetre.avecMoniteur === null || perimetre.formation === null || perimetre.usageProfessionnel === null || perimetre.locationPayante === null)
    b.push("Périmètre confirmé par l'assureur à valider manuellement (avec/sans moniteur, formation, usage professionnel, location payante)");
  if (!p.piecesOriginalesTeleversees) b.push("PDF originaux de l'attestation et des conditions particulières à téléverser et annexer");
  b.push(...p.documentsReferencesAbsents.map(d => `Document manquant : ${d}`));
  return b;
}

/** Projection vers l'annexe : garanties et franchises dictées, mais autorisations d'usage location laissées « à renseigner ». */
export function assuranceDepuisPolice(p: PoliceVehicule): AssuranceLocation {
  const g = (l: string) => p.garanties.find(x => x.libelle.startsWith(l));
  const fr = (l: string) => g(l)?.franchise ?? "";
  return {
    ...assuranceVide(),
    assureur: p.assureur, numeroPolice: `${p.numeroPolice} (contrat ${p.contrat})`,
    validiteDebut: p.validiteDebut, validiteFin: p.validiteFin,
    locationPayanteAutorisee: null, usageFormationExamenAutorise: null,
    conducteursAutorises: "Élève sous la garde du moniteur (attestation) ; conduite autonome NON confirmée",
    plafondRc: g("Responsabilité civile automobile")?.plafond ?? "",
    garanties: { dommages: true, vol: true, incendie: true, brisDeGlace: true, assistance: true },
    franchises: { dommages: fr("Dommages accidentels"), vol: fr("Vol"), incendie: fr("Incendie"), brisDeGlace: fr("Bris de glace") },
    plafonds: "Protection juridique option 1 : 10 000 €",
    exclusions: "", // CG 460.002I non fournies : aucune exclusion supposée
    demarchesDelais: "",
    contactSinistre: `Agent AXA ${p.agent}`,
  };
}

/** Lignes d'annexe spécifiques à la police (PDF). */
export function lignesAnnexePolice(p: PoliceVehicule, perim?: PerimetreValide): string[] {
  const statut = perim ? statutAssuranceLocation(perim) : null;
  const tri = (v: boolean | null) => v === true ? "oui" : v === false ? "non" : "à renseigner";
  return [
    `Police propre au véhicule ${p.immatriculation} – ${p.vehicule}. Version : ${p.versionCp} ; attestation du ${p.attestationDu.split("-").reverse().join("/")}.`,
    `Usage déclaré à l'assureur : ${p.usageDeclare}.`,
    `STATUT : ${statut ? statut.texte : `usage location à confirmer par écrit par AXA. ${STATUT_LOCATION_NON_AUTORISEE}.`} ${statut?.niveau === "ecrit" ? "Les garanties ci-dessous s'appliquent dans les conditions et exclusions de la police." : "Les garanties ci-dessous ne sont pas présumées applicables à une location tant que l'assureur ne l'a pas confirmé par écrit."}`,
    ...(perim ? [`Périmètre indiqué : conduite avec moniteur seulement : ${tri(perim.avecMoniteur)} ; formation : ${tri(perim.formation)} ; usage professionnel : ${tri(perim.usageProfessionnel)} ; location payante : ${tri(perim.locationPayante)}.`] : []),
    ...p.garanties.map(x => `${x.libelle} : ${x.souscrite === false ? "NON souscrite" : x.souscrite === "legale" ? "régime légal" : "souscrite"}${x.souscrite === false ? "" : ` – franchise par sinistre : ${x.franchise}`}${x.plafond ? ` – plafond : ${x.plafond}` : ""}.`),
    `Documents référencés non fournis (exclusions non supposées) : ${p.documentsReferencesAbsents.join(", ")}.`,
    "Distinction : le dépôt de garantie contractuel (500 € ou 0 €) n'est pas la franchise AXA (par ex. 700 € ou 100 €). Seules les sommes imputables au locataire selon sa responsabilité établie, la police et la loi peuvent lui être demandées, sur justificatifs ; aucune franchise n'est facturée automatiquement.",
  ];
}

/** Statut d'assurance imprimé sur le contrat : distingue écrit / oral déclaré / rien. */
export function statutAssuranceLocation(p: PerimetreValide): { niveau: "ecrit" | "oral" | "aucun"; texte: string } {
  if (p.confirmationAssureurRecue && p.referenceConfirmation.trim())
    return { niveau: "ecrit", texte: `Usage location confirmé par écrit par l'assureur (réf. ${p.referenceConfirmation.trim()}), dans le périmètre indiqué ci-dessous.` };
  if (p.accordOralDeclare && p.dateAccordOral)
    return { niveau: "oral", texte: `Accord ORAL de l'assureur déclaré par le loueur le ${p.dateAccordOral.split("-").reverse().join("/")}${p.interlocuteurAccordOral.trim() ? ` (interlocuteur : ${p.interlocuteurAccordOral.trim()})` : ""}. Aucune confirmation écrite n'est encore reçue : la couverture de la location n'est pas garantie par écrit et son périmètre exact reste à confirmer par l'assureur.` };
  return { niveau: "aucun", texte: STATUT_LOCATION_NON_AUTORISEE };
}

/** Blocages de la version papier à signer : assurance écrite OU accord oral daté, et périmètre renseigné. */
export function blocagesPoliceVersionASigner(p: PoliceVehicule | null, perimetre: PerimetreValide): string[] {
  if (!p) return ["Aucune police enregistrée pour ce véhicule"];
  const b: string[] = [];
  if (statutAssuranceLocation(perimetre).niveau === "aucun") b.push("Accord de l'assureur : confirmation écrite (référence) ou accord oral déclaré avec sa date");
  if (perimetre.avecMoniteur === null || perimetre.formation === null || perimetre.usageProfessionnel === null || perimetre.locationPayante === null)
    b.push("Périmètre indiqué par l'assureur (avec/sans moniteur, formation, usage professionnel, location payante)");
  return b;
}
