/**
 * Clauses renforcées du contrat de location (version location-preview-2026-11-12-v2).
 * APERÇU uniquement : texte soumis à vérification juridique humaine avant toute utilisation.
 * Aucune police, franchise ou garantie n'est inventée : tout champ inconnu reste « À renseigner »
 * et bloque la signature lorsqu'il est essentiel.
 */
export const VERSION_CONTRAT_LOCATION = "location-preview-2026-11-12-v2";
export const A_RENSEIGNER = "À renseigner";

export type Regime = "consommateur" | "professionnel" | "non_determine";
/** null = non coché / inconnu (jamais précoché). */
export type Tri = boolean | null;

export interface AssuranceLocation {
  assureur: string; numeroPolice: string; validiteDebut: string; validiteFin: string;
  locationPayanteAutorisee: Tri; usageFormationExamenAutorise: Tri;
  conducteursAutorises: string; plafondRc: string;
  garanties: { dommages: Tri; vol: Tri; incendie: Tri; brisDeGlace: Tri; assistance: Tri };
  franchises: { dommages: string; vol: string; incendie: string; brisDeGlace: string };
  plafonds: string; exclusions: string; demarchesDelais: string; contactSinistre: string;
}
export const assuranceVide = (): AssuranceLocation => ({
  assureur: "", numeroPolice: "", validiteDebut: "", validiteFin: "",
  locationPayanteAutorisee: null, usageFormationExamenAutorise: null,
  conducteursAutorises: "", plafondRc: "",
  garanties: { dommages: null, vol: null, incendie: null, brisDeGlace: null, assistance: null },
  franchises: { dommages: "", vol: "", incendie: "", brisDeGlace: "" },
  plafonds: "", exclusions: "", demarchesDelais: "", contactSinistre: "",
});

const v = (s: string | null | undefined) => (s && s.trim() ? s.trim() : A_RENSEIGNER);
const tri = (t: Tri) => (t === true ? "Oui (attesté par l'assureur)" : t === false ? "Non" : A_RENSEIGNER);

/** Éléments ESSENTIELS de l'annexe assurance : leur absence bloque la signature. */
export function manquantsAssurance(a: AssuranceLocation, finLocation: string): string[] {
  const m: string[] = [];
  if (!a.assureur.trim()) m.push("Assureur");
  if (!a.numeroPolice.trim()) m.push("Numéro de police");
  if (!a.validiteDebut || !a.validiteFin) m.push("Période de validité de la police");
  else if (finLocation && a.validiteFin < finLocation) m.push("Police expirant avant la fin de location");
  if (a.locationPayanteAutorisee !== true) m.push("Autorisation explicite de la location payante par l'assureur");
  if (a.usageFormationExamenAutorise !== true) m.push("Autorisation de l'usage formation / examen par l'assureur");
  if (!a.conducteursAutorises.trim()) m.push("Conducteurs autorisés");
  if (!a.plafondRc.trim()) m.push("Plafond responsabilité civile");
  (["dommages", "vol", "incendie", "brisDeGlace", "assistance"] as const).forEach(k => {
    if (a.garanties[k] === null) m.push(`Garantie ${LIB_GARANTIE[k]} : souscrite ou non`);
  });
  (["dommages", "vol", "incendie", "brisDeGlace"] as const).forEach(k => {
    if (a.garanties[k] === true && !a.franchises[k].trim()) m.push(`Franchise ${LIB_GARANTIE[k]} par sinistre`);
  });
  if (!a.exclusions.trim()) m.push("Exclusions de garantie");
  if (!a.demarchesDelais.trim()) m.push("Démarches et délais de déclaration de sinistre");
  return m;
}
export const LIB_GARANTIE = { dommages: "dommages au véhicule", vol: "vol", incendie: "incendie", brisDeGlace: "bris de glace", assistance: "assistance" } as const;

export interface LocataireSignature {
  nomComplet: string; email: string; telephone: string; adresse: string;
  numPermis: string; dateDelivrancePermis: string; prefecturePermis: string;
}
export interface ContexteSignature {
  locataire: LocataireSignature; vehiculeChoisi: boolean; immatriculation: string;
  dateDebut: string; dateFin: string; prixLocation: string; tarifJournalier: string;
  regime: Regime; assurance: AssuranceLocation;
  edlDepartSigne: boolean; consentementSpecifique: boolean; texteValideJuridiquement: boolean;
}
/** Motifs bloquant la signature. Liste vide = signable (le circuit de signature reste à brancher). */
export function blocagesSignature(c: ContexteSignature): string[] {
  const b: string[] = [];
  const l = c.locataire;
  if (!l.nomComplet.trim()) b.push("Nom et prénom du locataire");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email.trim())) b.push("E-mail du locataire");
  if (!l.telephone.trim()) b.push("Téléphone du locataire");
  if (!l.adresse.trim()) b.push("Adresse du locataire");
  if (!l.numPermis.trim() || !l.dateDelivrancePermis || !l.prefecturePermis.trim()) b.push("Permis B (numéro, date, autorité de délivrance)");
  if (!c.vehiculeChoisi || !c.immatriculation.trim()) b.push("Véhicule du parc choisi explicitement");
  if (!c.dateDebut || !c.dateFin || c.dateFin < c.dateDebut) b.push("Période de location cohérente");
  if (!c.prixLocation.trim()) b.push("Prix de location TTC");
  if (!c.tarifJournalier.trim()) b.push("Tarif journalier TTC (base de l'indemnité de retard)");
  if (c.regime === "non_determine") b.push("Qualité du locataire (consommateur ou professionnel)");
  b.push(...manquantsAssurance(c.assurance, c.dateFin).map(x => `Annexe assurance : ${x}`));
  if (!c.edlDepartSigne) b.push("État des lieux de départ signé par les deux parties");
  if (!c.consentementSpecifique) b.push("Consentement spécifique du locataire à ce contrat (aucune signature d'un autre document réutilisée)");
  if (!c.texteValideJuridiquement) b.push("Validation du texte final après vérification juridique humaine");
  return b;
}

/** Champs essentiels de la version papier à signer : tout sauf les éléments réalisés au moment de la signature. */
export function blocagesVersionASigner(c: Omit<ContexteSignature, "edlDepartSigne" | "consentementSpecifique" | "texteValideJuridiquement">): string[] {
  return blocagesSignature({ ...c, edlDepartSigne: true, consentementSpecifique: true, texteValideJuridiquement: true })
    .filter(x => !/^Annexe assurance : Autorisation/.test(x));
}

export interface Article { titre: string; paragraphes: string[] }
export interface ContexteClauses { avecCaution: boolean; regime: Regime; tarifJournalier: string; assurance: AssuranceLocation }

export function articleDepot(c: ContexteClauses): Article {
  const p = c.avecCaution ? [
    "5.1 Le locataire remet au loueur, avant la prise en charge, un chèque de dépôt de garantie de 500 € (cinq cents euros). Ce dépôt n'est ni une franchise d'assurance, ni un plafond de responsabilité, ni une pénalité.",
    "5.2 Le dépôt ne peut être encaissé, en tout ou partie, qu'à hauteur de sommes dont le locataire est redevable et qui sont justifiées par écrit (état des lieux contradictoire, devis ou facture de réparation, avis de contravention, facture de carburant), après information préalable du locataire et délai de 15 jours pour présenter ses observations (article 6.5). Aucun encaissement forfaitaire ou arbitraire n'est pratiqué.",
    "5.3 À défaut de somme justifiée, le chèque est restitué ou détruit en présence du locataire dans un délai de 5 jours ouvrés suivant la restitution du véhicule. Toute retenue partielle donne lieu à un décompte écrit accompagné des justificatifs.",
    "5.4 Si les sommes justifiées excèdent le dépôt, le solde reste dû dans les mêmes conditions de preuve ; il ne peut excéder le préjudice réellement subi.",
  ] : [
    "5.1 Sans caution : dépôt de garantie de 0 €. Aucun chèque, prélèvement ni préautorisation n'est demandé au titre d'un dépôt de garantie.",
    "5.2 Cette dispense ne supprime ni la franchise prévue par la police d'assurance figurant en annexe, ni la responsabilité du locataire telle qu'elle est établie selon les articles 6 et 7. Les sommes éventuellement dues sont facturées séparément, sur justificatifs et après la procédure contradictoire de l'article 6.5.",
  ];
  return { titre: `ARTICLE 5 – DÉPÔT DE GARANTIE (${c.avecCaution ? "AVEC CAUTION 500 €" : "SANS CAUTION 0 €"})`, paragraphes: p };
}

export function articleDommages(c: ContexteClauses): Article {
  const fr = c.assurance.garanties.dommages === true && c.assurance.franchises.dommages.trim() ? c.assurance.franchises.dommages.trim() : null;
  return { titre: "ARTICLE 6 – ÉTAT DES LIEUX ET DOMMAGES", paragraphes: [
    "6.1 État des lieux contradictoire. Un état des lieux de départ et un état des lieux de retour sont établis en présence des deux parties, sur l'annexe 2, et signés par chacune. Ils peuvent être complétés de photographies horodatées de chaque face du véhicule, de l'intérieur, du compteur et de la jauge, conservées par les deux parties. Un dommage absent de l'état des lieux de départ et constaté au retour est présumé survenu pendant la location, sauf preuve contraire du locataire (Code civil, art. 1731 et 1732).",
    "6.2 Retour hors présence du locataire. Si le locataire ne se présente pas à l'état des lieux de retour après avoir été invité par écrit à y assister, le loueur peut l'établir seul, avec photographies horodatées, et le transmet au locataire sous 48 heures ; le locataire dispose de 15 jours pour formuler ses réserves.",
    "6.3 Usure normale et vétusté. L'usure normale liée à un usage conforme et la vétusté ne sont pas imputables au locataire. Le coût de remise en état est apprécié en tenant compte de l'âge et de l'état antérieur de l'élément endommagé.",
    "6.4 Déclaration. Tout accident, choc ou dommage, même mineur, est signalé au loueur sans délai et au plus tard dans les 24 heures, par téléphone puis par écrit, avec constat amiable si un tiers est impliqué. Le locataire ne reconnaît pas sa responsabilité à la place du loueur auprès d'un tiers, sauf constat amiable.",
    "6.5 Chiffrage et contradictoire. Toute somme réclamée au titre d'un dommage repose sur un devis ou une facture d'un professionnel, communiqué au locataire avec l'état des lieux et les photographies. Le locataire dispose de 15 jours pour présenter ses observations ou un devis concurrent. En cas de désaccord, l'une ou l'autre partie peut demander une expertise contradictoire, chaque partie pouvant se faire assister ; les frais d'expertise suivent la responsabilité retenue.",
    "6.6 Partage des responsabilités. Le locataire répond des dommages survenus par sa faute ou celle des personnes qu'il a laissé utiliser le véhicule, dans la limite du préjudice réel. Il ne répond pas des dommages causés par un tiers identifié et responsable, ni des dommages pris en charge par l'assurance du loueur, sous réserve de la franchise ci-dessous.",
    `6.7 Franchise. Lorsque l'assurance du loueur intervient, seule la franchise effectivement prévue par la police figurant en annexe 1, appliquée au sinistre concerné et justifiée par le décompte de l'assureur, peut être mise à la charge du locataire dont la responsabilité est établie. Franchise dommages déclarée : ${fr ?? A_RENSEIGNER}. À défaut de garantie ou d'intervention de l'assurance, le locataire reste tenu dans les conditions des articles 6.5 et 6.6, sans forfait.`,
    "6.8 Aucun prélèvement, encaissement du dépôt ou facturation n'intervient avant la communication des justificatifs et l'expiration du délai d'observations de l'article 6.5. Le locataire conserve tous ses recours, y compris judiciaires et de médiation (article 11).",
  ] };
}

export function articleVol(c: ContexteClauses): Article {
  const g = c.assurance.garanties.vol;
  const fr = g === true && c.assurance.franchises.vol.trim() ? c.assurance.franchises.vol.trim() : null;
  return { titre: "ARTICLE 7 – VOL, TENTATIVE DE VOL ET PERTE DES CLÉS", paragraphes: [
    "7.1 Signalement. En cas de vol, de tentative de vol ou de vandalisme, le locataire prévient le loueur sans délai, par téléphone puis par écrit, en indiquant le lieu, la date, l'heure et les circonstances.",
    "7.2 Plainte. Le locataire dépose plainte sans délai auprès des services de police ou de gendarmerie et transmet au loueur le récépissé de dépôt de plainte dès qu'il l'a obtenu, et au plus tard dans les 48 heures.",
    "7.3 Clés et documents. Le locataire remet au loueur, dans le même délai, toutes les clés et tous les documents du véhicule restés en sa possession. L'absence de remise est mentionnée et le locataire en explique la raison par écrit.",
    `7.4 Déclaration à l'assureur. Le loueur déclare le sinistre à son assureur dans les formes et délais prévus par la police (annexe 1 : ${v(c.assurance.demarchesDelais)}). Le locataire coopère loyalement : réponses aux demandes de l'assureur et des enquêteurs, attestation sur l'honneur, communication des pièces utiles.`,
    `7.5 Garantie vol. Garantie vol souscrite : ${tri(g)}. Franchise vol par sinistre : ${fr ?? A_RENSEIGNER}. Le présent contrat ne garantit aucune couverture vol qui ne figurerait pas dans la police annexée.`,
    "7.6 Responsabilité. Le vol n'emporte aucune présomption automatique que le locataire doit la valeur du véhicule. Le locataire n'est tenu qu'en cas de faute établie (notamment clés laissées dans ou sur le véhicule, véhicule non verrouillé, remise du véhicule à un tiers non autorisé) ou d'exclusion de garantie qui lui a été communiquée avant signature, et seulement dans la limite du préjudice réel justifié et, le cas échéant, de la franchise applicable.",
    "7.7 Perte des clés. La perte ou le vol des clés est signalé sans délai ; le coût de remplacement justifié par facture peut être facturé au locataire si la perte lui est imputable.",
  ] };
}

export function articleRestitution(c: ContexteClauses): Article {
  const tj = c.tarifJournalier.trim() ? `${c.tarifJournalier.trim()} € TTC` : A_RENSEIGNER;
  return { titre: "ARTICLE 8 – RESTITUTION, RETARD ET NON-RESTITUTION", paragraphes: [
    "8.1 Échéance. Le véhicule est restitué aux date, heure et lieu prévus à l'article 3, avec ses clés et documents, dans l'état décrit à l'état des lieux de départ, sous réserve de l'usure normale.",
    "8.2 Prolongation. Toute prolongation fait l'objet d'un accord écrit préalable (courriel ou SMS accepté) précisant la nouvelle échéance et le prix.",
    "8.3 Retard. Une tolérance de 30 minutes est accordée. Au-delà, et sauf accord ou cas de force majeure dûment justifié, le retard donne lieu à une indemnité calculée au prorata du tarif journalier de location, par demi-journée entamée, soit la moitié du tarif journalier par demi-journée : tarif journalier = " + tj + ". Cette indemnité correspond à l'immobilisation du véhicule ; le juge peut la modérer si elle est manifestement excessive (Code civil, art. 1231-5).",
    "8.4 Relance et mise en demeure. En l'absence de restitution à l'échéance, le loueur contacte le locataire par téléphone, SMS et courriel. Sans restitution ni réponse dans les 24 heures, il lui adresse une mise en demeure écrite (lettre recommandée ou courriel avec accusé de réception) de restituer le véhicule dans un délai de 48 heures, en rappelant le lieu de restitution et les sommes dues.",
    "8.5 Distinction retard / détournement. Un simple retard ne constitue pas un vol. Le loueur ne signale le véhicule aux autorités et ne dépose plainte qu'après l'expiration de la mise en demeure restée sans effet ou en présence d'éléments sérieux de détournement (refus exprès de restituer, injoignabilité prolongée après mise en demeure, usage contraire à l'article 9) ; la qualification pénale appartient aux autorités et aux juridictions.",
    "8.6 Récupération. Le loueur récupère le véhicule uniquement par des moyens légaux : restitution amiable, intervention des forces de l'ordre ou décision de justice. Aucune voie de fait (enlèvement par la force, intrusion dans un lieu privé, rétention des affaires du locataire) n'est pratiquée.",
    "8.7 Indemnisation. En cas de non-restitution, le locataire doit l'indemnité de l'article 8.3 jusqu'à la restitution ou la récupération, et le préjudice justifié (frais de récupération, dommages, coût de location d'un véhicule de remplacement pour un candidat). Chaque somme est justifiée et soumise à la procédure de l'article 6.5.",
    "8.8 Preuve. Les échanges (appels, SMS, courriels, accusés de réception, photographies horodatées, état des lieux) sont conservés par les parties et peuvent être produits comme preuve.",
  ] };
}

export function articleLitiges(c: ContexteClauses): Article {
  if (c.regime === "professionnel") return { titre: "ARTICLE 11 – RÉCLAMATIONS ET LITIGES", paragraphes: [
    "11.1 Toute réclamation est adressée par écrit à contact@ftransport.fr ; le loueur y répond dans un délai de 15 jours.",
    "11.2 Entre professionnels, à défaut d'accord amiable, compétence est attribuée au Tribunal de commerce de Lyon, sous réserve que la clause ait été spécifiée de façon très apparente (Code de procédure civile, art. 48).",
  ] };
  return { titre: "ARTICLE 11 – RÉCLAMATIONS, MÉDIATION ET LITIGES", paragraphes: [
    "11.1 Toute réclamation est adressée par écrit à contact@ftransport.fr ; le loueur y répond dans un délai de 15 jours.",
    `11.2 Médiation de la consommation. À défaut de solution amiable dans un délai de deux mois suivant la réclamation écrite, le locataire consommateur peut saisir gratuitement le médiateur de la consommation dont relève le loueur : ${A_RENSEIGNER} (nom, adresse, site internet du médiateur) (Code de la consommation, art. L612-1 et L616-1).`,
    "11.3 Le locataire consommateur peut saisir, à son choix, outre l'une des juridictions territorialement compétentes en vertu du Code de procédure civile, la juridiction du lieu où il demeurait au moment de la conclusion du contrat ou de la survenance du fait dommageable (Code de la consommation, art. R631-3). Aucune clause ne prive le consommateur de ces options.",
    "11.4 Droit de rétractation. Lorsque le contrat est conclu à distance ou hors établissement, le droit de rétractation ne s'applique pas aux prestations de location de voitures devant être fournies à une date ou à une période déterminée (Code de la consommation, art. L221-28, 12°). Cette exclusion est portée à la connaissance du locataire avant la signature.",
  ] };
}

export function annexeAssurance(a: AssuranceLocation): Article {
  return { titre: "ANNEXE 1 – ASSURANCE DU VÉHICULE (obligatoire avant signature)", paragraphes: [
    `Assureur : ${v(a.assureur)}`, `N° de police : ${v(a.numeroPolice)}`,
    `Validité : du ${v(a.validiteDebut)} au ${v(a.validiteFin)}`,
    `Location payante expressément autorisée par l'assureur : ${tri(a.locationPayanteAutorisee)}`,
    `Usage formation / examen pratique autorisé : ${tri(a.usageFormationExamenAutorise)}`,
    `Conducteurs autorisés : ${v(a.conducteursAutorises)}`,
    `Responsabilité civile obligatoire (Code des assurances, art. L211-1) – plafond : ${v(a.plafondRc)}`,
    `Garantie dommages au véhicule : ${tri(a.garanties.dommages)} – franchise par sinistre : ${a.garanties.dommages === true ? v(a.franchises.dommages) : "sans objet ou " + A_RENSEIGNER}`,
    `Garantie vol : ${tri(a.garanties.vol)} – franchise par sinistre : ${a.garanties.vol === true ? v(a.franchises.vol) : "sans objet ou " + A_RENSEIGNER}`,
    `Garantie incendie : ${tri(a.garanties.incendie)} – franchise par sinistre : ${a.garanties.incendie === true ? v(a.franchises.incendie) : "sans objet ou " + A_RENSEIGNER}`,
    `Garantie bris de glace : ${tri(a.garanties.brisDeGlace)} – franchise par sinistre : ${a.garanties.brisDeGlace === true ? v(a.franchises.brisDeGlace) : "sans objet ou " + A_RENSEIGNER}`,
    `Assistance : ${tri(a.garanties.assistance)}`,
    `Autres plafonds : ${v(a.plafonds)}`, `Exclusions opposables au locataire : ${v(a.exclusions)}`,
    `Démarches et délais de déclaration : ${v(a.demarchesDelais)}`, `Contact sinistre : ${v(a.contactSinistre)}`,
    "Les mentions ci-dessus reproduisent l'attestation et les conditions de l'assureur, dont copie est remise au locataire. Toute mention « À renseigner » sur un élément essentiel interdit la signature du contrat.",
  ] };
}

export const PIECES_JUSTIFICATIVES = [
  "Pièce d'identité du locataire (vérifiée, non conservée au-delà du nécessaire)",
  "Permis de conduire B en cours de validité (recto/verso)",
  "Justificatif de domicile de moins de 3 mois",
  "Attestation d'assurance et conditions de la police du loueur (annexe 1)",
  "Certificat d'immatriculation et procès-verbal de contrôle technique en cours de validité",
  "État des lieux de départ signé + photographies horodatées",
  "État des lieux de retour signé + photographies horodatées",
  "Chèque de dépôt de garantie et reçu (avec caution uniquement)",
  "Devis / factures / rapports d'expertise en cas de dommage",
  "Récépissé de plainte en cas de vol",
  "Mise en demeure et accusés de réception en cas de non-restitution",
];

export function annexePieces(avecCaution: boolean): Article {
  return { titre: "ANNEXE 3 – PIÈCES JUSTIFICATIVES ET TRAÇABILITÉ", paragraphes: [
    ...PIECES_JUSTIFICATIVES.filter(p => avecCaution || !p.startsWith("Chèque")).map(p => `☐ ${p}`),
    `Version du modèle : ${VERSION_CONTRAT_LOCATION}. Chaque signature (contrat, état des lieux de départ, état des lieux de retour) est datée, nominative et spécifique à ce contrat ; aucune signature recueillie pour un autre document (dossier d'inscription, CMA) n'est réutilisée.`,
  ] };
}
