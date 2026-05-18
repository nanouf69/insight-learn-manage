import { jsPDF } from "jspdf";

export interface ContratFranchiseData {
  representantNom: string;
  lieu: string;
  date: string; // dd/mm/yyyy
  signatureDataUrl: string; // base64 PNG
  initiales?: string; // ex: "JS"
}

/**
 * Génère le PDF du Contrat de Franchise Finally Academy / FTransport
 * Retourne un Blob.
 */
export function generateContratFranchisePdf(data: ContratFranchiseData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (need: number) => {
    if (y + need > pageH - 20) {
      doc.addPage();
      y = margin;
    }
  };

  const h1 = (text: string) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(text, margin, y);
    y += 8;
  };
  const h2 = (text: string) => {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(text, margin, y);
    y += 6;
  };
  const p = (text: string, opts: { bold?: boolean; box?: boolean } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, maxW - (opts.box ? 6 : 0));
    const h = lines.length * 5 + (opts.box ? 6 : 0);
    ensureSpace(h + 2);
    if (opts.box) {
      doc.setDrawColor(180);
      doc.setFillColor(245, 245, 250);
      doc.rect(margin, y - 4, maxW, h, "FD");
      doc.text(lines, margin + 3, y);
    } else {
      doc.text(lines, margin, y);
    }
    y += h + 2;
  };
  const bullet = (text: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize("• " + text, maxW - 4);
    ensureSpace(lines.length * 5 + 1);
    doc.text(lines, margin + 2, y);
    y += lines.length * 5 + 1;
  };

  // En-tête
  h1("CONTRAT DE FRANCHISE");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("FINALLY ACADEMY LTD / FTRANSPORT SERVICES PRO", margin, y);
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.text("Version protégée — applicable depuis le début du partenariat", margin, y);
  y += 8;

  h2("ARTICLE PRÉLIMINAIRE — ANNULATION DU CONTRAT PRÉCÉDENT");
  p(
    "CLAUSE D'ANNULATION : Le présent contrat annule et remplace intégralement tout accord, contrat de franchise ou document contractuel antérieur conclu entre FTRANSPORT SERVICES PRO et la société RSTARTR (SIRET 913 343 489), ainsi que toute entité liée à RSTARTR (notamment SASU THE BUILDERY). Aucune clause, obligation ou condition financière issue de ces accords ne subsiste à compter de la signature des présentes.",
    { bold: true, box: true }
  );
  bullet("L'ancien contrat RSTARTR est réputé nul et sans effet.");
  bullet("Aucune somme calculée sur la base des conditions de l'ancien contrat n'est due.");
  bullet("Le présent contrat constitue le seul accord régissant les relations entre les parties.");

  h2("ENTRE LES SOUSSIGNÉS");
  p("Le Franchiseur :", { bold: true });
  p(
    "FINALLY ACADEMY LTD — Société de droit britannique\n124-128 City Road, London EC1V 2NX, United Kingdom\nCompany registration number : 16512432\nNon assujettie à la TVA (below UK VAT threshold)\nReprésentée par : " +
      (data.representantNom || "______________") +
      "\nCi-après désignée « le Franchiseur »"
  );
  p("Le Franchisé :", { bold: true });
  p(
    "FTRANSPORT SERVICES PRO — SASU au capital de 5 000 €\nSIRET : 823 461 561 000 18 — NDA : 84 69 15114 69\n86 route de Genas, 69003 Lyon\nCertifiée Qualiopi — Référencée MonCompteFormation (EDOF)\nReprésentée par M. Guenichi Naoufal, en qualité de Gérant\nCi-après désignée « le Franchisé »"
  );

  h2("PRÉAMBULE");
  p(
    "FINALLY ACADEMY LTD propose un concept de franchise dans la formation professionnelle. Le Franchisé, titulaire d'un référencement actif sur MonCompteFormation et certifié Qualiopi, souhaite bénéficier de l'accompagnement du Franchiseur. Le présent contrat est conclu en remplacement intégral de tout accord antérieur (notamment RSTARTR) et définit les nouvelles conditions financières et opérationnelles applicables depuis le début du partenariat."
  );
  p(
    "Le Franchisé demeure l'unique responsable vis-à-vis de la CDC et de tout organisme de contrôle français. Le Franchiseur, société de droit britannique, ne peut être tenu responsable des obligations réglementaires françaises incombant au Franchisé."
  );

  h2("ARTICLE 1 — OBJET DU CONTRAT");
  p("Le Franchiseur concède au Franchisé le droit d'utiliser le concept, savoir-faire et outils FINALLY ACADEMY LTD :");
  bullet("Mise à disposition d'outils pédagogiques et administratifs");
  bullet("Apport de prospects / leads qualifiés (conditions Article 5)");
  bullet("Assistance commerciale et administrative");
  bullet("Accès à la plateforme e-learning FINALLY ACADEMY");
  p("Le Franchisé conserve son indépendance totale dans la gestion de son activité, de son référencement MCF et de sa certification Qualiopi.");

  h2("ARTICLE 2 — CONDITIONS FINANCIÈRES");
  p("2.1 — Répartition des encaissements", { bold: true });
  p(
    "Sur chaque encaissement perçu par FTRANSPORT SERVICES PRO au titre des formations : 50% sont reversés au Franchiseur (FINALLY ACADEMY LTD) et 50% restent acquis au Franchisé. Ces conditions remplacent toute condition antérieure (notamment les 90% prévus dans l'ancien contrat RSTARTR).",
    { bold: true, box: true }
  );
  p("Répartition indicative des 50% Franchiseur :");
  bullet("Redevance de franchise (marque, savoir-faire) : 15%");
  bullet("Redevance d'assistance et accompagnement : 10%");
  bullet("Redevance plateforme et outils : 10%");
  bullet("Redevance apport de clients / leads : 15%");

  p("2.2 — Modalités de paiement", { bold: true });
  p("Paiement par virement bancaire dans un délai de 30 jours à compter de l'encaissement effectif des fonds par le Franchisé. Aucun paiement anticipé exigible. Virements en euros, frais à charge du Franchiseur.");

  p("2.3 — Application rétroactive", { bold: true });
  p("Les conditions 50/50 s'appliquent à toutes les factures émises et encaissements perçus à compter du 1er mai 2025. Les factures antérieures restent soumises à l'ancien régime (10% Franchisé / 90% Franchiseur). Les Articles 3, 4 et 5 s'appliquent depuis le début du partenariat. Toute somme perçue au-delà de 50% à compter du 1er mai 2025 constitue un trop-perçu restituable.");

  h2("ARTICLE 3 — RESPONSABILITÉ");
  p(
    "LE FRANCHISÉ N'EST PAS RESPONSABLE DES AGISSEMENTS DU FRANCHISEUR. Toute fraude, pratique déloyale ou manquement commis par FINALLY ACADEMY LTD engage sa seule responsabilité.",
    { bold: true, box: true }
  );
  p("3.1 — Indemnisation obligatoire", { bold: true });
  p("Si FTRANSPORT subit une sanction CDC/DGCCRF/DREETS du fait du Franchiseur, ce dernier indemnise intégralement le Franchisé :");
  bullet("Remboursement des sommes restituées à la CDC");
  bullet("Pénalités et amendes infligées");
  bullet("Perte de CA liée à un déréférencement MCF / suspension Qualiopi");
  bullet("Frais d'avocat, procédure, expertise");
  bullet("Préjudice d'image et commercial");
  p("3.2 — Garantie de conformité des leads", { bold: true });
  p("Le Franchiseur garantit que tous les leads sont obtenus conformément à la réglementation française (Art. L.6323-8-1 Code du travail, RGPD, interdiction d'avantages indus). En cas de non-conformité, il assume seul la responsabilité civile et pénale.");

  h2("ARTICLE 4 — OBLIGATIONS ET INTERDICTIONS DU FRANCHISEUR");
  bullet("Tout démarchage sans mandat écrit préalable");
  bullet("Toute utilisation du référencement MCF / Qualiopi de FTRANSPORT à des fins non prévues");
  bullet("Toute sous-traitance sans accord écrit");
  bullet("Toute communication aux apprenants non validée");
  bullet("Tout acte engageant la responsabilité du Franchisé vis-à-vis de la CDC ou DGCCRF");
  bullet("Toute cession du contrat sans accord écrit");

  h2("ARTICLE 5 — SUSPENSION ET BLOCAGE DES PAIEMENTS");
  p("Le Franchisé peut suspendre immédiatement tout paiement sans mise en demeure préalable en cas de :");
  bullet("Manquement aux interdictions de l'Article 4");
  bullet("Notification CDC/DGCCRF en lien avec le Franchiseur");
  bullet("Non-conformité avérée ou présumée des leads");
  bullet("Ouverture d'un contrôle MCF / Qualiopi");
  bullet("Litige en cours relatif à l'exécution du contrat");

  h2("ARTICLE 6 — RÉSILIATION");
  p("6.1 — Faute grave (sans préavis)", { bold: true });
  p("Résiliation immédiate sans préavis ni indemnité par email ou LRAR en cas de violation Article 4, non-conformité leads, fausse déclaration ou manquement grave.");
  p("6.2 — Sans faute", { bold: true });
  p("Chaque partie peut résilier à tout moment par LRAR avec préavis de 15 jours calendaires, sans indemnité.");
  p("6.3 — Effets de la résiliation", { bold: true });
  bullet("Le Franchisé cesse d'utiliser la marque et outils FINALLY ACADEMY");
  bullet("Le Franchiseur restitue sous 30 jours toute somme perçue en trop");
  bullet("Les formations en cours sont menées à terme");
  bullet("Les sommes dues au titre de l'Article 3 restent exigibles");

  h2("ARTICLE 7 — CONFIDENTIALITÉ ET PROPRIÉTÉ INTELLECTUELLE");
  p("Le Franchiseur s'engage à la plus stricte confidentialité (apprenants, processus, données financières) pendant le contrat et 5 ans après. Les données apprenants sont propriété exclusive du Franchisé. Tout support pédagogique produit dans le cadre du contrat appartient à FTRANSPORT SERVICES PRO.");

  h2("ARTICLE 8 — DROIT APPLICABLE ET JURIDICTION");
  p("Contrat régi exclusivement par le droit français. Recherche d'une solution amiable sous 30 jours, à défaut compétence exclusive du Tribunal de Commerce de Lyon. Langue : français.");

  h2("ARTICLE 9 — DURÉE ET ENTRÉE EN VIGUEUR");
  p("Entrée en vigueur à la signature, durée indéterminée sous réserve de l'Article 6. Conditions financières 50/50 applicables à compter du 1er mai 2025. Articles 3, 4 et 5 applicables depuis le début du partenariat.");
  p("Exception : la facture n° 1546A du 11 mai 2026 (15 461,40 €) reste soumise à l'ancien régime 10% Franchisé / 90% Franchiseur.");

  // SIGNATURES
  doc.addPage();
  y = margin;
  h1("SIGNATURES");
  p(`Fait à ${data.lieu || "Lyon"}, le ${data.date}`);
  y += 4;

  const colW = (maxW - 8) / 2;
  const sigY = y;

  // Franchiseur
  doc.setDrawColor(120);
  doc.rect(margin, sigY, colW, 75);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Pour le Franchiseur", margin + 3, sigY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("FINALLY ACADEMY LTD", margin + 3, sigY + 12);
  doc.text("124-128 City Road, London EC1V 2NX", margin + 3, sigY + 17);
  doc.text("Company n° 16512432", margin + 3, sigY + 22);
  doc.text(`Représentant : ${data.representantNom}`, margin + 3, sigY + 27);
  doc.text("Signature :", margin + 3, sigY + 34);
  try {
    if (data.signatureDataUrl) {
      doc.addImage(data.signatureDataUrl, "PNG", margin + 3, sigY + 36, colW - 6, 32);
    }
  } catch {
    // ignore image errors
  }

  // Franchisé
  const x2 = margin + colW + 8;
  doc.rect(x2, sigY, colW, 75);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Pour le Franchisé", x2 + 3, sigY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("FTRANSPORT SERVICES PRO", x2 + 3, sigY + 12);
  doc.text("86 route de Genas, 69003 Lyon", x2 + 3, sigY + 17);
  doc.text("SIRET : 823 461 561 000 18", x2 + 3, sigY + 22);
  doc.text("Guenichi Naoufal, Gérant", x2 + 3, sigY + 27);
  doc.text("Signature : (à signer)", x2 + 3, sigY + 34);

  y = sigY + 82;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Mention manuscrite : « Lu et approuvé — Bon pour accord »", margin, y);

  return doc.output("blob");
}
