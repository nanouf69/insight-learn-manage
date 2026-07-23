/**
 * Générateur PDF canonique unique du DEVIS FTRANSPORT.
 *
 * ⚠️ Il existait auparavant DEUX générateurs différents (public + admin) qui
 * produisaient des devis qui ne se ressemblaient pas et dont l'un manquait
 * plusieurs mentions légales obligatoires (L6353-5 / L6353-6, RIB, bordereau
 * de renonciation complet, encadré EMETTEUR, financeur, etc.).
 *
 * Ce module est désormais la SEULE source de vérité pour la génération du
 * devis : le formulaire public `DevisPersonnel.tsx` et le panneau admin
 * `DevisSection.tsx` l'appellent tous les deux avec les mêmes règles.
 *
 * Le PDF produit contient toujours, dans l'ordre :
 *   1. En-tête FTRANSPORT + n° devis + dates
 *   2. Encadré EMETTEUR / CLIENT
 *   3. Encadré FINANCEUR (si organisme)
 *   4. Encadré FORMATION (désignation, durée, agrément, dates)
 *   5. Tableau détail prestation + totaux HT / TVA / TTC
 *   6. Modalités de paiement + avertissement TAXI si applicable
 *   7. RIB Revolut
 *   8. Mentions obligatoires (L6353-5 / L6353-6 / TVA / SIRET / N° déclaration)
 *   9. Zones de signature client + FTRANSPORT
 *  10. Pages CGV
 *  11. Bordereau de renonciation au délai de rétractation
 */

import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const RIB_INFO = {
  titulaire: "SERVICES PRO FTRANSPORT",
  adresse: "86 ROUTE DE GENAS, 69003 LYON 3EME",
  swift: "REVOFRP2",
  iban: "FR76 2823 3000 0185 7527 9099 426",
  banque: "Revolut Bank UAB",
};

export const CGV_TEXT = `CONDITIONS GENERALES DE VENTE - FTRANSPORT

FTRANSPORT est un organisme de formation professionnelle specialise dans le secteur du transport de personnes.
Siege social : 86 route de Genas, 69003 Lyon
Numero SIRET : 82346156100018
Numero de declaration d'activite : 84 69 15114 69
(Cet enregistrement ne vaut pas agrement de l'Etat)
Organisme non assujetti a la TVA
Contact : 04.28.29.60.91 | contact@ftransport.fr

DEFINITIONS
CLIENT : toute personne physique ou morale qui s'inscrit ou passe commande d'une formation aupres de FTRANSPORT.
STAGIAIRE : la personne physique qui participe a une formation dispensee par FTRANSPORT.
CGV : les conditions generales de vente, detaillees ci-dessous.
OPCO : les organismes paritaires collecteurs agrees charges de collecter et gerer l'effort de formation des entreprises.
FORMATION : l'ensemble des actions de formation dispensees par FTRANSPORT dans le cadre de ses agrements.

ARTICLE 1 - OBJET ET CHAMP D'APPLICATION
Les presentes conditions generales de vente s'appliquent a l'ensemble des prestations de formation engagees par FTRANSPORT pour le compte d'un Client, qu'il s'agisse de formations initiales VTC, TAXI, passerelles (TA, VA), formations continues ou formations pratiques. Le fait de s'inscrire ou de passer commande implique l'adhesion entiere et sans reserve du Client aux presentes conditions generales de vente. Toute condition contraire posee par le Client sera, a defaut d'acceptation expresse, inopposable a FTRANSPORT, quel que soit le moment ou elle aura pu etre portee a sa connaissance.

ARTICLE 2 - DELAI DE RETRACTATION
Conformement a l'article L6353-5 du Code du travail, le Client beneficie d'un delai de retractation de dix (10) jours a compter de la conclusion du contrat de formation professionnelle.
Le Client peut exercer son droit de retractation par lettre recommandee avec avis de reception adressee a FTRANSPORT a l'adresse suivante : 86 route de Genas, 69003 Lyon, ou par e-mail a : contact@ftransport.fr
Aucun paiement ne sera exige du Client avant l'expiration de ce delai de retractation.
En cas d'exercice du droit de retractation dans le delai imparti, toute somme deja versee sera integralement remboursee dans un delai de 30 jours.

ARTICLE 3 - CONDITIONS FINANCIERES, REGLEMENTS ET MODALITES DE PAIEMENT
Tous les prix sont indiques en euros, toutes taxes comprises. FTRANSPORT n'est pas assujetti a la TVA.

3.1 - Modalites de paiement pour les particuliers
Conformement a l'article L6353-6 du Code du travail, lorsque le Client est une personne physique qui finance elle-meme sa formation :
- Aucune somme ne peut etre exigee avant l'expiration du delai de retractation de 10 jours.
- A l'expiration de ce delai, un premier versement ne pourra exceder 30% du prix total de la formation.
- Le solde sera echelonne au fur et a mesure du deroulement de la formation, selon un echeancier qui sera communique au Client.
Toutefois, le Client reste libre de regler l'integralite du montant de la formation en avance s'il le souhaite, apres l'expiration du delai de retractation de 10 jours. Ce paiement anticipe ne peut en aucun cas etre impose ou exige par FTRANSPORT.
Moyens de paiement acceptes : especes, virement bancaire, cheque.

3.2 - Modalites de paiement pour les entreprises et organismes financeurs
Lorsque la formation est financee par une entreprise, un OPCO, France Travail (anciennement Pole Emploi) ou tout autre organisme financeur, le paiement integral peut etre demande avant le debut de la formation, conformement aux accords conclus avec ces organismes. En cas de prise en charge partielle, le solde restant a la charge du Client sera facture selon les memes modalites que pour un financement personnel.

3.3 - Retard de paiement
Toute somme non payee a echeance entraine de plein droit et sans mise en demeure prealable, l'application de penalites d'un montant egal a une fois et demie le taux d'interet legal en vigueur, ainsi qu'une indemnite forfaitaire pour frais de recouvrement de 40 euros (article D441-5 du Code de commerce). FTRANSPORT se reserve le droit de suspendre la formation en cas de non-paiement.

3.4 - Frais d'examen
Lorsque la formation inclut les frais d'examen (inscription a l'examen CMA), ceux-ci sont compris dans le prix total indique sur le devis. Si la formation ne les inclut pas, le stagiaire devra s'inscrire et regler les frais d'examen directement aupres de la Chambre des Metiers et de l'Artisanat (CMA).

ARTICLE 4 - INSCRIPTION ET EFFECTIF
L'effectif de chaque formation est limite a 18 stagiaires pour les formations theoriques et 3 stagiaires pour les formations pratiques. Les inscriptions sont prises en compte dans leur ordre d'arrivee.
L'inscription devient definitive apres signature du contrat de formation et expiration du delai de retractation de 10 jours, conformement aux articles L6353-3 et suivants du Code du travail.
Seuls les contrats dument renseignes, dates, signes et revetus de la mention "Bon pour accord" ont valeur contractuelle.
FTRANSPORT se reserve le droit d'ajourner ou d'annuler une session de formation si le nombre minimal de participants n'est pas atteint. Le Client en sera informe au moins 7 jours avant la date prevue et pourra reporter son inscription sur une session ulterieure ou demander le remboursement integral des sommes versees.

ARTICLE 5 - CONTRAT DE FORMATION POUR LES PARTICULIERS
Conformement aux articles L6353-3 et L6353-4 du Code du travail, lorsqu'une personne physique finance elle-meme sa formation, un contrat de formation professionnelle est conclu entre FTRANSPORT et le stagiaire AVANT l'inscription definitive et tout reglement de frais. Ce contrat mentionne notamment :
- L'intitule, la nature, la duree, les effectifs prevus et les modalites du deroulement de la formation ;
- Le prix de la formation et les modalites de reglement ;
- Les conditions financieres prevues en cas de cessation anticipee de la formation ou d'abandon en cours de stage.

ARTICLE 6 - DEDIT ET REMPLACEMENT D'UN PARTICIPANT
En cas de dedit signifie par le Client a FTRANSPORT au moins 7 jours ouvrables avant le demarrage de la formation, FTRANSPORT offre au Client la possibilite de repousser l'inscription du Stagiaire a une formation ulterieure ou de le remplacer par un autre participant repondant aux memes criteres d'eligibilite.
En cas de dedit signifie moins de 7 jours ouvrables avant le debut de la formation, FTRANSPORT se reserve le droit de facturer un dedit forfaitaire de 30% du prix total de la formation. Ce dedit ne s'applique pas en cas de force majeure dument justifiee.

ARTICLE 7 - ANNULATION, ABSENCE OU INTERRUPTION D'UNE FORMATION
7.1 - Annulation par le Client : tout module commence est du dans son integralite. En cas d'abandon ou d'interruption prematuree de la formation par le Client pour un motif autre que la force majeure, le prix de la formation reste integralement du.
7.2 - Annulation par FTRANSPORT : FTRANSPORT se reserve le droit d'annuler ou de reporter une formation en cas de force majeure, d'insuffisance d'inscriptions, d'absence imprevisible d'un formateur ou de tout autre evenement exceptionnel.

ARTICLE 8 - ASSIDUITE ET CONTROLE DE PRESENCE
La presence du stagiaire est obligatoire et controlee par une feuille d'emargement signee par demi-journee. Pour les formations en E-learning, le controle est effectue via la plateforme (connexion, progression, controles periodiques).

ARTICLE 9 - HORAIRES ET ACCUEIL
Formations en presentiel : Journee de 09h00 a 12h00 et de 13h00 a 16h00 (formation continue VTC : 13h00 a 17h00), Soiree de 17h00 a 21h00, avec une pause de 15 minutes en milieu de chaque demi-journee.
Lieu : 86 route de Genas, 69003 Lyon, sauf indication contraire.
Plateforme E-learning : accessible 24h/24, 7j/7 pendant 3 mois.

ARTICLE 10 - REGLEMENT INTERIEUR
Le reglement interieur applicable aux stagiaires est remis a chaque participant avant le debut de la formation, conformement aux articles L6352-3 et suivants du Code du travail.

ARTICLE 11 - OBLIGATIONS, RESPONSABILITES ET FORCE MAJEURE
FTRANSPORT est tenue a une obligation de moyens. Le stagiaire s'engage a suivre la formation avec assiduite et a respecter le reglement interieur. FTRANSPORT ne pourra etre tenue responsable en cas de force majeure au sens de l'article 1218 du Code civil. FTRANSPORT dispose d'une assurance responsabilite civile professionnelle.

ARTICLE 12 - PROPRIETE INTELLECTUELLE
L'ensemble des contenus et supports pedagogiques utilises par FTRANSPORT constituent des oeuvres protegees par le droit d'auteur (articles L111-1 et suivants du Code de la propriete intellectuelle) et sont la propriete exclusive de FTRANSPORT ou de ses partenaires. Toute reproduction ou diffusion non autorisee constitue un delit de contrefacon.

ARTICLE 13 - ACCESSIBILITE AUX PERSONNES EN SITUATION DE HANDICAP
FTRANSPORT s'engage a accueillir les personnes en situation de handicap dans les meilleures conditions. Referent handicap : contact@ftransport.fr / 04.28.29.60.91.

ARTICLE 14 - PROTECTION DES DONNEES PERSONNELLES
Conformement au RGPD (Reglement UE 2016/679) et a la loi n 78-17 du 6 janvier 1978, le Stagiaire dispose d'un droit d'acces, de rectification, de limitation, d'opposition, de portabilite et d'effacement. Contact : contact@ftransport.fr.

ARTICLE 15 - RECLAMATIONS ET MEDIATION
Toute reclamation peut etre adressee par e-mail (contact@ftransport.fr) ou par courrier. FTRANSPORT accuse reception sous 48h et repond sous 15 jours. En cas de litige non resolu, le Client peut recourir gratuitement a un mediateur de la consommation (articles L611-1 et suivants du Code de la consommation).

ARTICLE 16 - DROIT APPLICABLE ET REGLEMENT DES LITIGES
Les presentes CGV sont regies par le droit francais. A defaut d'accord amiable sous 30 jours, le litige sera porte devant les Tribunaux competents de Lyon.

---
Numero de declaration d'activite : 84 69 15114 69 - Cet enregistrement ne vaut pas agrement de l'Etat
Ftransport n'est pas assujetti a la TVA
Services Pro - FTransport - SASU au capital social de 5 000 euros
SIRET : 82346156100018 | 86 route de Genas - 69003 LYON | Tel : 04.28.29.60.91 | contact@ftransport.fr`;

export const formatEUR = (n: number): string => {
  const parts = n.toFixed(2).replace(".", ",").split(",");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${parts[0]},${parts[1]} EUR`;
};

export type DevisFinanceur = {
  nom: string;
  type?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  siret?: string;
  email?: string;
  telephone?: string;
  contactNom?: string;
};

export type DevisLigne = {
  designation: string;
  quantite: number;
  prixUnitaire: number;
};

export type CanonicalDevisInput = {
  numDevis: string;
  dateDevis: Date;
  dateValidite: Date;
  client: {
    civilite?: string;
    prenom: string;
    nom: string;
    adresse?: string;
    codePostal?: string;
    ville?: string;
    telephone?: string;
    email?: string;
    dateNaissance?: string;
  };
  typeFinancement: "personnel" | "organisme";
  financeur?: DevisFinanceur;
  formation: {
    designation: string;
    duree?: string;
    agrement?: string;
    type?: "vtc" | "taxi" | null;
    isElearning?: boolean;
  };
  lignes: DevisLigne[];
  tvaTaux?: number;
  sessionDate?: string;
  creneau?: string;
  notes?: string;
  signatureDataUrl?: string | null;
};

/** Génère le devis PDF canonique et retourne l'instance jsPDF prête à sauver / exporter. */
export function buildCanonicalDevisPDF(input: CanonicalDevisInput): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;

  const {
    numDevis, dateDevis, dateValidite,
    client, typeFinancement, financeur,
    formation, lignes,
    tvaTaux = 0, sessionDate, creneau, notes, signatureDataUrl,
  } = input;

  const dateToday = format(dateDevis, "dd MMMM yyyy", { locale: fr });
  const validite = format(dateValidite, "dd MMMM yyyy", { locale: fr });

  const totalHT = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const montantTVA = totalHT * (tvaTaux / 100);
  const totalTTC = totalHT + montantTVA;

  let y = 15;

  // === HEADER ===
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageW, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("FTRANSPORT", margin, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Organisme de formation professionnelle", margin, 25);
  doc.text("86 route de Genas - 69003 Lyon", margin, 30);
  doc.text("04.28.29.60.91 | contact@ftransport.fr", margin, 35);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("DEVIS", pageW - margin, 18, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`N° ${numDevis}`, pageW - margin, 25, { align: "right" });
  doc.text(`Date : ${dateToday}`, pageW - margin, 30, { align: "right" });
  doc.text(`Valide jusqu'au : ${validite}`, pageW - margin, 35, { align: "right" });

  y = 45;
  doc.setTextColor(0, 0, 0);

  // === EMETTEUR / CLIENT ===
  const halfW = contentW / 2 - 3;
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, halfW, 32, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text("EMETTEUR", margin + 3, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.text("SERVICES PRO FTRANSPORT", margin + 3, y + 10);
  doc.text("SASU au capital de 5 000 EUR", margin + 3, y + 14);
  doc.text("SIRET : 82346156100018", margin + 3, y + 18);
  doc.text("86 route de Genas - 69003 Lyon", margin + 3, y + 22);
  doc.text("N° decl. activite : 84 69 15114 69", margin + 3, y + 26);
  doc.setFontSize(7);
  doc.text("(Cet enregistrement ne vaut pas agrement de l'Etat)", margin + 3, y + 30);

  const clientX = margin + halfW + 6;
  doc.setFillColor(239, 246, 255);
  doc.rect(clientX, y, halfW, 32, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text("CLIENT / STAGIAIRE", clientX + 3, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.text(`${client.civilite || ""} ${client.prenom} ${client.nom}`.trim(), clientX + 3, y + 10);
  if (client.adresse) doc.text(client.adresse, clientX + 3, y + 14);
  doc.text(`${client.codePostal || ""} ${client.ville || ""}`.trim(), clientX + 3, y + 18);
  if (client.telephone) doc.text(`Tel : ${client.telephone}`, clientX + 3, y + 22);
  if (client.email) doc.text(client.email, clientX + 3, y + 26);
  if (client.dateNaissance) {
    try { doc.text(`Ne(e) le : ${format(new Date(client.dateNaissance), "dd/MM/yyyy")}`, clientX + 3, y + 30); }
    catch { /* ignore */ }
  }
  y += 38;

  // === FINANCEUR ===
  if (typeFinancement === "organisme" && financeur?.nom) {
    doc.setFillColor(255, 249, 235);
    doc.setDrawColor(251, 191, 36);
    doc.rect(margin, y, contentW, 24, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(120, 53, 15);
    doc.text("ORGANISME FINANCEUR / PAYEUR", margin + 3, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.text(`${financeur.nom}${financeur.type ? ` (${financeur.type})` : ""}`, margin + 3, y + 10);
    const addr = [financeur.adresse, `${financeur.codePostal || ""} ${financeur.ville || ""}`.trim()].filter(Boolean).join(" - ");
    if (addr.trim()) doc.text(addr, margin + 3, y + 14);
    const details: string[] = [];
    if (financeur.siret) details.push(`SIRET : ${financeur.siret}`);
    if (financeur.email) details.push(financeur.email);
    if (financeur.telephone) details.push(financeur.telephone);
    if (financeur.contactNom) details.push(`Contact : ${financeur.contactNom}`);
    if (details.length) doc.text(details.join(" | "), margin + 3, y + 18);
    doc.setDrawColor(0, 0, 0);
    y += 30;
  }

  // === FORMATION ===
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  const formBoxH = 22;
  doc.rect(margin, y, contentW, formBoxH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text("FORMATION", margin + 3, y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(formation.designation, margin + 3, y + 10.5);
  const metaLine = [
    formation.duree ? `Duree : ${formation.duree}` : "",
    formation.agrement ? `Agrement : ${formation.agrement}` : "",
  ].filter(Boolean).join("  |  ");
  if (metaLine) doc.text(metaLine, margin + 3, y + 15);
  const datesLine: string[] = [];
  if (formation.isElearning) {
    datesLine.push("E-learning : plateforme disponible 3 mois a compter de l'inscription");
  } else {
    if (sessionDate) datesLine.push(`Session : ${sessionDate}`);
    if (creneau) datesLine.push(`Creneau : ${creneau}`);
  }
  if (datesLine.length) doc.text(datesLine.join("  |  "), margin + 3, y + 19.5);
  doc.setDrawColor(0, 0, 0);
  y += formBoxH + 6;

  // === DETAIL PRESTATION ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text("DETAIL DE LA PRESTATION", margin, y);
  y += 6;

  const col0x = margin;
  const col1x = margin + 100;
  const col2x = margin + 125;
  const col3x = margin + 152;
  const tableRight = pageW - margin;

  doc.setFillColor(30, 58, 138);
  doc.rect(margin, y, contentW, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Designation", col0x + 2, y + 5.5);
  doc.text("Qte", col1x + 10, y + 5.5, { align: "center" });
  doc.text("Prix unitaire", col2x + 21, y + 5.5, { align: "center" });
  doc.text("Total TTC", tableRight - 2, y + 5.5, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  lignes.forEach((ligne, idx) => {
    const designW = col1x - col0x - 4;
    const designLines = doc.splitTextToSize(ligne.designation, designW);
    const nbLines = Math.max(1, Math.min(designLines.length, 3));
    const rowH = Math.max(10, nbLines * 4.5 + 4);

    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 250 : 255);
    doc.rect(margin, y, contentW, rowH, "F");
    doc.setDrawColor(210, 210, 210);
    doc.line(margin, y, tableRight, y);
    doc.line(margin, y + rowH, tableRight, y + rowH);
    doc.line(col1x, y, col1x, y + rowH);
    doc.line(col2x, y, col2x, y + rowH);
    doc.line(col3x, y, col3x, y + rowH);
    doc.line(margin, y, margin, y + rowH);
    doc.line(tableRight, y, tableRight, y + rowH);

    doc.setFontSize(8);
    const vertCenter = y + rowH / 2 + 1;
    const linesToShow = designLines.slice(0, 3);
    const textStartY = y + 4;
    linesToShow.forEach((l: string, li: number) => doc.text(l, col0x + 2, textStartY + li * 4));
    doc.text(String(ligne.quantite), col1x + 10, vertCenter, { align: "center" });
    doc.text(formatEUR(ligne.prixUnitaire), col2x + 26, vertCenter, { align: "right" });
    doc.text(formatEUR(ligne.quantite * ligne.prixUnitaire), tableRight - 2, vertCenter, { align: "right" });
    y += rowH;
  });

  // === TOTAUX ===
  y += 6;
  const totBoxX = margin + contentW * 0.55;
  const totBoxW = contentW * 0.45;
  const totBoxH = 22;
  doc.setFillColor(243, 244, 246);
  doc.rect(totBoxX, y, totBoxW, totBoxH, "F");
  doc.setDrawColor(210, 210, 210);
  doc.rect(totBoxX, y, totBoxW, totBoxH);
  const totSepX = totBoxX + totBoxW * 0.58;
  doc.line(totSepX, y, totSepX, y + totBoxH);
  doc.line(totBoxX, y + 8, totBoxX + totBoxW, y + 8);
  doc.line(totBoxX, y + 15, totBoxX + totBoxW, y + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Total HT :", totSepX - 2, y + 5.5, { align: "right" });
  doc.text(`TVA (${tvaTaux}%${tvaTaux === 0 ? " - Non assujetti" : ""}) :`, totSepX - 2, y + 12.5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text("TOTAL TTC :", totSepX - 2, y + 19.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(formatEUR(totalHT), totBoxX + totBoxW - 3, y + 5.5, { align: "right" });
  doc.text(formatEUR(montantTVA), totBoxX + totBoxW - 3, y + 12.5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text(formatEUR(totalTTC), totBoxX + totBoxW - 3, y + 19.5, { align: "right" });

  // === MODALITES PAIEMENT ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text("MODALITES DE PAIEMENT", margin, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  if (typeFinancement === "personnel") {
    doc.text("Financement personnel", margin, y + 7);
    doc.text("Moyens : especes, virement, cheque", margin, y + 11);
    doc.text("Acompte 30% puis solde echelonne (art. L6353-6)", margin, y + 15);
  } else {
    doc.text(`Prise en charge par : ${financeur?.nom || "Organisme"}`, margin, y + 7);
    if (financeur?.type) doc.text(`Type : ${financeur.type}`, margin, y + 11);
    doc.text("Reglement selon convention", margin, y + 15);
  }
  y += totBoxH + 10;

  // === AVERTISSEMENT TAXI ===
  if (formation.type === "taxi") {
    const warnH = 22;
    doc.setFillColor(254, 226, 226);
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentW, warnH, "FD");
    doc.setLineWidth(0.2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28);
    doc.text("ATTENTION - MOBILITE DEPARTEMENTALE TAXI", margin + 3, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(153, 27, 27);
    const warnText = "Vous pourrez exercer uniquement dans le departement dans lequel vous avez reussi l'examen. Pour exercer dans un autre departement, une formation de mobilite de 14h sera obligatoire dans le departement ou vous souhaitez poursuivre votre activite de taxi.";
    doc.splitTextToSize(warnText, contentW - 6).forEach((l: string, li: number) => {
      doc.text(l, margin + 3, y + 10 + li * 3.5);
    });
    y += warnH + 6;
    doc.setTextColor(0, 0, 0);
  }

  // === RIB ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text("COORDONNEES BANCAIRES (VIREMENT)", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Titulaire : ${RIB_INFO.titulaire}`, margin, y); y += 3.5;
  doc.text(`IBAN : ${RIB_INFO.iban}`, margin, y); y += 3.5;
  doc.text(`BIC / SWIFT : ${RIB_INFO.swift}  |  Banque : ${RIB_INFO.banque}`, margin, y); y += 8;

  // === MENTIONS ===
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  const rappel = "Ce devis est valable pour la duree indiquee ci-dessus sous reserve de places disponibles. Inscription validee : devis + fiche inscription + CGV remplis et signes + documents justificatifs + reglement.";
  doc.splitTextToSize(rappel, contentW).forEach((l: string) => { doc.text(l, margin, y); y += 3; });
  y += 3;

  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  [
    "Conformement a l'article L6353-5 du Code du travail, le client beneficie d'un delai de retractation de 10 jours.",
    "Conformement a l'article L6353-6, aucun paiement ne peut etre exige avant l'expiration du delai de retractation.",
    "Organisme de formation : SERVICES PRO FTRANSPORT - SASU au capital de 5 000 EUR - SIRET : 82346156100018",
    "N° de declaration d'activite : 84 69 15114 69 aupres du Prefet de la region Auvergne-Rhone-Alpes",
    "Non assujetti a la TVA (Art. 261-4-4° du CGI).",
  ].forEach(m => {
    const ml = doc.splitTextToSize(m, contentW);
    doc.text(ml, margin, y);
    y += ml.length * 2.8 + 0.5;
  });

  if (notes && notes.trim()) {
    y += 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    doc.text("Notes :", margin, y); y += 3.5;
    const nl = doc.splitTextToSize(notes, contentW);
    doc.text(nl, margin, y);
    y += nl.length * 3.2 + 2;
  }

  // === SIGNATURES ===
  y = Math.max(y + 4, 220);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(`A Lyon, le ${dateToday}`, margin, y);
  y += 6;

  const sigBoxW = 80;
  const sigBoxH = 30;
  doc.setDrawColor(180, 180, 180);
  doc.rect(margin, y, sigBoxW, sigBoxH);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Signature client + "Bon pour accord"', margin + 2, y + 5);
  if (signatureDataUrl) {
    doc.addImage(signatureDataUrl, "PNG", margin + 2, y + 7, sigBoxW - 4, sigBoxH - 9);
    doc.setFontSize(6.5);
    doc.setTextColor(30, 58, 138);
    doc.text(`Signe electroniquement le ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin + 2, y + sigBoxH - 2);
  }
  const sigFtransX = pageW - margin - sigBoxW;
  doc.setDrawColor(180, 180, 180);
  doc.rect(sigFtransX, y, sigBoxW, sigBoxH);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Pour FTRANSPORT", sigFtransX + 2, y + 5);
  doc.setFontSize(7);
  doc.text("Le responsable de formation", sigFtransX + 2, y + 9);

  // === FOOTER ===
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text("FTRANSPORT - SASU au capital de 5 000 EUR - SIRET : 82346156100018 - N Decl. : 84 69 15114 69", margin, 288);
  doc.text("Non assujetti TVA | contact@ftransport.fr | 04.28.29.60.91 | 86 route de Genas, 69003 Lyon", margin, 293);

  // === CGV ===
  doc.addPage();
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("CONDITIONS GENERALES DE VENTE", pageW / 2, 13, { align: "center" });

  y = 28;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  for (const line of CGV_TEXT.split("\n")) {
    if (y > 285) {
      doc.addPage();
      y = 15;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
    }
    const trimmed = line.trim();
    if (trimmed === "") { y += 2; continue; }
    const isTitle = trimmed.startsWith("ARTICLE") || trimmed === "CONDITIONS GENERALES DE VENTE - FTRANSPORT" || trimmed === "DEFINITIONS";
    if (isTitle) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 58, 138);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
    }
    const wrapped = doc.splitTextToSize(trimmed, contentW);
    doc.text(wrapped, margin, y);
    y += wrapped.length * (isTitle ? 4.5 : 3.5) + (isTitle ? 1 : 0);
  }

  // === BORDEREAU RENONCIATION ===
  doc.addPage();
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("BORDEREAU DE RENONCIATION AU DELAI DE RETRACTATION", pageW / 2, 13, { align: "center" });

  y = 30;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  [
    "Conformement a l'article L6353-5 du Code du travail, tout client beneficie d'un delai de retractation de dix (10) jours a compter de la signature du contrat de formation professionnelle.",
    "",
    "Toutefois, si le client souhaite que la formation debute avant l'expiration de ce delai, il peut renoncer expressement a son droit de retractation en remplissant et signant le present bordereau.",
    "",
    "Cette renonciation n'emporte aucune consequence financiere pour le client si elle est exercee avant le debut effectif de la formation.",
  ].forEach(line => {
    if (line === "") { y += 3; return; }
    const wrapped = doc.splitTextToSize(line, contentW);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 4;
  });

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text("INFORMATIONS DU CLIENT", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  [
    `Nom et prenom : ${client.civilite || ""} ${client.prenom} ${client.nom}`.trim(),
    `Adresse : ${client.adresse ? client.adresse + ", " : ""}${client.codePostal || ""} ${client.ville || ""}`.trim(),
    `Telephone : ${client.telephone || "_______________"}`,
    `Email : ${client.email || "_______________"}`,
  ].forEach(l => { doc.text(l, margin, y); y += 5; });

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text("FORMATION CONCERNEE", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Formation : ${formation.designation}`, margin, y); y += 5;
  if (formation.duree) { doc.text(`Duree : ${formation.duree}`, margin, y); y += 5; }
  doc.text(`Montant TTC : ${formatEUR(totalTTC)}`, margin, y); y += 5;
  if (!formation.isElearning && sessionDate) { doc.text(`Session : ${sessionDate}`, margin, y); y += 5; }
  if (formation.isElearning) { doc.text("Modalite : E-learning (plateforme 3 mois)", margin, y); y += 5; }

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text("DECLARATION DE RENONCIATION", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  [
    `Je soussigne(e), ${client.civilite || ""} ${client.prenom} ${client.nom}`.trim() + ", declare avoir pris connaissance des conditions generales de vente de FTRANSPORT et du delai de retractation de dix (10) jours prevu par l'article L6353-5 du Code du travail.",
    "",
    "Par la presente, je renonce expressement a l'exercice de mon droit de retractation et demande que la formation commence avant l'expiration du delai de dix jours.",
    "",
    "Je reconnais que cette renonciation est faite librement et sans aucune pression.",
  ].forEach(line => {
    if (line === "") { y += 3; return; }
    const wrapped = doc.splitTextToSize(line, contentW);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 4;
  });

  y += 12;
  doc.text(`Fait a Lyon, le ${dateToday}`, margin, y);
  y += 10;

  doc.setDrawColor(180, 180, 180);
  doc.rect(margin, y, 80, 30);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Signature du client", margin + 2, y + 5);
  doc.text("precedee de la mention", margin + 2, y + 9);
  doc.text('"Lu et approuve, bon pour renonciation"', margin + 2, y + 13);
  if (signatureDataUrl) doc.addImage(signatureDataUrl, "PNG", margin + 2, y + 14, 76, 14);
  const sigFtransX2 = pageW - margin - 80;
  doc.rect(sigFtransX2, y, 80, 30);
  doc.text("Pour FTRANSPORT", sigFtransX2 + 2, y + 5);
  doc.text("Le responsable de formation", sigFtransX2 + 2, y + 9);

  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text("FTRANSPORT - SASU au capital de 5 000 EUR - SIRET : 82346156100018 - N Decl. : 84 69 15114 69", margin, 288);
  doc.text("Non assujetti TVA | contact@ftransport.fr | 04.28.29.60.91 | 86 route de Genas, 69003 Lyon", margin, 293);

  // === PAGE NUMBERS ===
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "italic");
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} / ${pageCount}`, pageW / 2, 297, { align: "center" });
  }

  return doc;
}
