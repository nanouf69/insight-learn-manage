import { jsPDF } from "jspdf";

export interface ContratFranchiseData {
  representantNom: string;
  lieu: string;
  date: string; // dd/mm/yyyy
  signatureDataUrl: string; // base64 PNG
  initiales?: string; // ex: "JS"
}

type TextValue = string | ((data: ContratFranchiseData) => string);

export type ContratFranchiseBlock =
  | { type: "title" | "subtitle" | "italic" | "heading2" | "heading3" | "paragraph" | "box" | "noteHeading"; text: TextValue }
  | { type: "bullets"; items: TextValue[] }
  | { type: "table"; rows: TextValue[][]; headerRows?: number };

const value = (text: TextValue, data: ContratFranchiseData) =>
  typeof text === "function" ? text(data) : text;

export function buildContratFranchiseContent(data: ContratFranchiseData): ContratFranchiseBlock[] {
  const representant = data.representantNom || "______________";

  return [
    { type: "title", text: "CONTRAT DE FRANCHISE" },
    { type: "subtitle", text: "FINALLY ACADEMY LTD / FTRANSPORT SERVICES PRO" },
    { type: "italic", text: "Version protégée — applicable depuis le début du partenariat" },

    { type: "heading2", text: "ARTICLE PRÉLIMINAIRE — ANNULATION ET REMPLACEMENT DU CONTRAT PRÉCÉDENT" },
    {
      type: "box",
      text: "CLAUSE D'ANNULATION : Le présent contrat annule et remplace intégralement tout accord, contrat de franchise ou document contractuel antérieur conclu entre FTRANSPORT SERVICES PRO et la société RSTARTR (SIRET 913 343 489, siège 9 rue Jean Jaurès, 42300 Roanne), ainsi que tout contrat conclu avec toute entité liée à RSTARTR, notamment la SASU THE BUILDERY. Aucune clause, aucune obligation, aucune condition financière issue de ces précédents accords ne subsiste à compter de la signature des présentes.",
    },
    { type: "paragraph", text: "Les parties reconnaissent expressément que :" },
    {
      type: "bullets",
      items: [
        "L'ancien contrat RSTARTR est réputé nul, caduc et sans effet à compter de la date de signature du présent contrat",
        "Aucune somme calculée sur la base des conditions de l'ancien contrat RSTARTR n'est due, quelle que soit la période concernée",
        "Le présent contrat constitue le seul et unique accord régissant les relations entre FINALLY ACADEMY LTD et FTRANSPORT SERVICES PRO",
      ],
    },

    { type: "heading2", text: "ENTRE LES SOUSSIGNÉS" },
    { type: "paragraph", text: "Le Franchiseur :" },
    {
      type: "paragraph",
      text: `FINALLY ACADEMY LTD\nSociété de droit britannique\n124-128 City Road, London EC1V 2NX, United Kingdom\nCompany registration number : 16512432\nNon assujettie à la TVA (below UK VAT threshold)\nReprésentée par : ${representant}\nCi-après désignée « le Franchiseur »`,
    },
    { type: "paragraph", text: "Le Franchisé :" },
    {
      type: "paragraph",
      text: "FTRANSPORT SERVICES PRO\nSASU au capital de 5 000 euros\nSIRET : 823 461 561 000 18 — NDA : 84 69 15114 69\n86 route de Genas, 69003 Lyon\nCertifiée Qualiopi — Référencée MonCompteFormation (EDOF)\nReprésentée par M. Guenichi Naoufal, en qualité de Gérant\nCi-après désignée « le Franchisé »",
    },

    { type: "heading2", text: "PRÉAMBULE" },
    {
      type: "paragraph",
      text: "FINALLY ACADEMY LTD propose un concept de franchise dans le domaine de la formation professionnelle. Le Franchisé, titulaire d'un référencement actif sur la plateforme MonCompteFormation (MCF) et certifié Qualiopi, souhaite bénéficier de l'accompagnement du Franchiseur dans le développement de son activité.",
    },
    {
      type: "paragraph",
      text: "Le présent contrat est conclu en remplacement intégral de tout accord antérieur, notamment avec RSTARTR, et définit les nouvelles conditions financières et opérationnelles applicables depuis le début du partenariat entre les parties.",
    },
    {
      type: "paragraph",
      text: "Il est expressément rappelé que le Franchisé demeure l'unique responsable vis-à-vis de la Caisse des Dépôts et Consignations (CDC) et de tout organisme de contrôle français. Le Franchiseur, société de droit britannique, ne peut en aucun cas être tenu responsable des obligations réglementaires françaises incombant au Franchisé.",
    },

    { type: "heading2", text: "ARTICLE 1 — OBJET DU CONTRAT" },
    {
      type: "paragraph",
      text: "Le Franchiseur concède au Franchisé le droit d'utiliser le concept, le savoir-faire et les outils développés par FINALLY ACADEMY LTD dans le cadre de la formation professionnelle, notamment :",
    },
    {
      type: "bullets",
      items: [
        "Mise à disposition d'outils pédagogiques et administratifs",
        "Apport de prospects / leads qualifiés (dans les conditions de l'Article 5)",
        "Assistance commerciale et administrative",
        "Accès à la plateforme e-learning FINALLY ACADEMY",
      ],
    },
    {
      type: "paragraph",
      text: "Le Franchisé conserve son indépendance totale dans la gestion de son activité, de son référencement MCF et de sa certification Qualiopi.",
    },

    { type: "heading2", text: "ARTICLE 2 — CONDITIONS FINANCIÈRES" },
    { type: "heading3", text: "2.1 — Répartition des encaissements" },
    {
      type: "box",
      text: "CONDITIONS APPLICABLES DEPUIS LE DÉBUT DU PARTENARIAT : Sur chaque encaissement perçu par FTRANSPORT SERVICES PRO au titre des formations, 50% (cinquante pourcent) sont reversés au Franchiseur (FINALLY ACADEMY LTD) et 50% (cinquante pourcent) restent acquis à FTRANSPORT SERVICES PRO. Les 50% dus au Franchiseur correspondent à sa rémunération pour les services définis au présent contrat. Ces conditions remplacent et annulent toute condition financière antérieure (notamment les 90% de redevances prévus dans l'ancien contrat RSTARTR).",
    },
    {
      type: "paragraph",
      text: "La répartition globale des 50% dus au Franchiseur se décompose comme suit, à titre indicatif :",
    },
    {
      type: "table",
      headerRows: 1,
      rows: [
        ["Prestation", "% encaissements"],
        ["Redevance de franchise (marque, savoir-faire)", "15%"],
        ["Redevance d'assistance et accompagnement", "10%"],
        ["Redevance plateforme et outils", "10%"],
        ["Redevance apport de clients / leads", "15%"],
        ["TOTAL Franchiseur", "50%"],
        ["FTRANSPORT SERVICES PRO (Franchisé)", "50%"],
      ],
    },
    { type: "heading3", text: "2.2 — Modalités de paiement" },
    {
      type: "paragraph",
      text: "Le paiement est effectué par virement bancaire dans un délai de 30 jours à compter de l'encaissement effectif des fonds par le Franchisé.",
    },
    {
      type: "paragraph",
      text: "Aucun paiement anticipé ne peut être exigé par le Franchiseur avant encaissement effectif. Toute clause contraire est nulle.",
    },
    {
      type: "paragraph",
      text: "Les virements sont libellés en euros. Tout frais de conversion ou de virement international est à la charge exclusive du Franchiseur.",
    },
    { type: "heading3", text: "2.3 — Application rétroactive" },
    {
      type: "paragraph",
      text: "Les présentes conditions financières (50% / 50%) s'appliquent à toutes les factures émises et à tous les encaissements perçus à compter du 1er mai 2025, nonobstant tout accord antérieur. Toute facture antérieure au 1er mai 2025 reste soumise à l'ancien régime (10% Franchisé / 90% Franchiseur). Les clauses de protection, de responsabilité et d'interdiction prévues aux Articles 3, 4 et 5 du présent contrat s'appliquent quant à elles depuis le début du partenariat entre les parties, sans limitation de date.",
    },
    {
      type: "paragraph",
      text: "Toute somme perçue par le Franchiseur au-delà de 50% des encaissements à compter du 1er mai 2025 constitue un trop-perçu restituable au Franchisé.",
    },

    { type: "heading2", text: "ARTICLE 3 — RESPONSABILITÉ — CLAUSE ESSENTIELLE" },
    {
      type: "box",
      text: "LE FRANCHISÉ N'EST PAS RESPONSABLE DES AGISSEMENTS DU FRANCHISEUR. Toute fraude, pratique commerciale déloyale, violation réglementaire ou manquement commis par FINALLY ACADEMY LTD ou ses représentants engage la seule et exclusive responsabilité de FINALLY ACADEMY LTD, sans que FTRANSPORT SERVICES PRO puisse en être tenue responsable vis-à-vis de quelque tiers que ce soit.",
    },
    { type: "heading3", text: "3.1 — Indemnisation obligatoire" },
    {
      type: "paragraph",
      text: "Si FTRANSPORT SERVICES PRO subit une sanction de la CDC, de la DGCCRF, des DREETS ou de toute autorité administrative ou judiciaire du fait direct ou indirect de FINALLY ACADEMY LTD, le Franchiseur s'engage à indemniser intégralement le Franchisé, notamment :",
    },
    {
      type: "bullets",
      items: [
        "Remboursement des sommes restituées à la CDC ou tout organisme financeur",
        "Pénalités et amendes infligées au Franchisé",
        "Perte de chiffre d'affaires liée à un déréférencement MCF ou suspension Qualiopi",
        "Frais d'avocat, de procédure et d'expertise",
        "Préjudice d'image et commercial",
      ],
    },
    { type: "heading3", text: "3.2 — Garantie de conformité des leads" },
    {
      type: "paragraph",
      text: "Le Franchiseur garantit expressément que l'ensemble des prospects et leads fournis au Franchisé sont obtenus par des moyens strictement conformes à la réglementation française, notamment :",
    },
    {
      type: "bullets",
      items: [
        "Sans démarchage téléphonique ou numérique non sollicité interdit par l'Art. L.6323- 8-1 du Code du travail",
        "Sans offre d'avantage indu à un apprenant en contrepartie d'une inscription MCF",
        "En conformité avec le RGPD et la réglementation sur la protection des données",
      ],
    },
    {
      type: "paragraph",
      text: "En cas de non-conformité avérée, le Franchiseur assume seul l'entière responsabilité civile et pénale en découlant.",
    },

    { type: "heading2", text: "ARTICLE 4 — OBLIGATIONS ET INTERDICTIONS DU FRANCHISEUR" },
    {
      type: "paragraph",
      text: "Il est strictement interdit au Franchiseur, sous peine de résiliation immédiate et de poursuites :",
    },
    {
      type: "bullets",
      items: [
        "Tout démarchage d'apprenants au nom ou pour le compte de FTRANSPORT SERVICES PRO sans mandat écrit préalable",
        "Toute utilisation du référencement MCF ou de la certification Qualiopi de FTRANSPORT SERVICES PRO à des fins autres que celles expressément prévues au présent contrat",
        "Toute sous-traitance des missions confiées à des tiers sans accord écrit préalable du Franchisé",
        "Toute communication aux apprenants d'informations sur FTRANSPORT SERVICES PRO non validées par le Franchisé",
        "Tout acte susceptible d'engager la responsabilité du Franchisé vis-à-vis de la CDC, de la DGCCRF ou de tout autre organisme de contrôle",
        "Toute cession ou transmission du présent contrat à un tiers sans accord écrit préalable du Franchisé",
      ],
    },

    { type: "heading2", text: "ARTICLE 5 — SUSPENSION ET BLOCAGE DES PAIEMENTS" },
    {
      type: "paragraph",
      text: "Le Franchisé se réserve le droit de suspendre immédiatement tout paiement dû au Franchiseur, sans mise en demeure préalable, dans les cas suivants :",
    },
    {
      type: "bullets",
      items: [
        "Constatation ou forte présomption d'un manquement aux interdictions de l'Article 4",
        "Réception d'une notification de la CDC, DGCCRF ou toute autorité en lien avec les agissements du Franchiseur",
        "Non-conformité avérée ou présumée des leads fournis",
        "Ouverture d'une procédure de contrôle MCF ou Qualiopi en lien avec les activités du Franchiseur",
        "Litige en cours relatif à l'exécution du présent contrat",
      ],
    },
    {
      type: "paragraph",
      text: "La suspension est notifiée par email ou LRAR et prend effet immédiatement. Les sommes suspendues sont libérées ou définitivement retenues selon l'issue de la vérification.",
    },

    { type: "heading2", text: "ARTICLE 6 — RÉSILIATION" },
    { type: "heading3", text: "6.1 — Résiliation pour faute grave (sans préavis)" },
    {
      type: "paragraph",
      text: "Le Franchisé peut résilier le présent contrat avec effet immédiat, sans préavis ni indemnité, par simple email ou LRAR, en cas de :",
    },
    {
      type: "bullets",
      items: [
        "Violation des interdictions de l'Article 4",
        "Non-conformité des leads ayant entraîné ou risquant d'entraîner une sanction CDC",
        "Fausse déclaration du Franchiseur sur sa structure, son actionnariat ou ses pratiques",
        "Manquement grave aux obligations du présent contrat",
      ],
    },
    { type: "heading3", text: "6.2 — Résiliation sans faute" },
    {
      type: "paragraph",
      text: "Chaque partie peut résilier le présent contrat à tout moment par lettre recommandée avec un préavis de 15 jours calendaires, sans indemnité.",
    },
    { type: "heading3", text: "6.3 — Effets de la résiliation" },
    { type: "paragraph", text: "En cas de résiliation, pour quelque cause que ce soit :" },
    {
      type: "bullets",
      items: [
        "Le Franchisé cesse d'utiliser la marque et les outils FINALLY ACADEMY",
        "Le Franchiseur restitue dans les 30 jours toute somme perçue en trop",
        "Les formations en cours sont menées à terme par le Franchisé sans interruption",
        "Toute somme due au Franchisé au titre de l'indemnisation (Article 3) reste exigible nonobstant la résiliation",
      ],
    },

    { type: "heading2", text: "ARTICLE 7 — CONFIDENTIALITÉ ET PROPRIÉTÉ INTELLECTUELLE" },
    {
      type: "paragraph",
      text: "Le Franchiseur s'engage à la confidentialité la plus stricte concernant les données des apprenants, les processus pédagogiques et les données financières de FTRANSPORT SERVICES PRO, pendant toute la durée du contrat et pour une durée de 5 ans après sa cessation.",
    },
    {
      type: "paragraph",
      text: "Les données des apprenants de FTRANSPORT SERVICES PRO sont la propriété exclusive du Franchisé et ne peuvent en aucun cas être utilisées, cédées ou transmises par le Franchiseur à des tiers.",
    },
    {
      type: "paragraph",
      text: "Tout support pédagogique produit par ou pour FTRANSPORT SERVICES PRO dans le cadre du présent contrat est la propriété exclusive de FTRANSPORT SERVICES PRO.",
    },

    { type: "heading2", text: "ARTICLE 8 — DROIT APPLICABLE ET JURIDICTION" },
    {
      type: "paragraph",
      text: "Le présent contrat est régi exclusivement par le droit français, nonobstant la nationalité britannique du Franchiseur.",
    },
    {
      type: "paragraph",
      text: "En cas de litige, les parties s'engagent à rechercher une solution amiable dans un délai de 30 jours.",
    },
    {
      type: "paragraph",
      text: "À défaut d'accord amiable, tout litige sera soumis à la compétence exclusive du Tribunal de Commerce de Lyon.",
    },
    {
      type: "paragraph",
      text: "La langue du contrat est le français. En cas de traduction, seule la version française fait foi.",
    },

    { type: "heading2", text: "ARTICLE 9 — DURÉE ET ENTRÉE EN VIGUEUR" },
    {
      type: "paragraph",
      text: "Le présent contrat entre en vigueur à compter de sa signature par les deux parties et se substitue immédiatement à tout accord antérieur.",
    },
    {
      type: "paragraph",
      text: "Il est conclu pour une durée indéterminée, sous réserve des conditions de résiliation de l'Article 6.",
    },
    {
      type: "paragraph",
      text: "Les conditions financières (50%/50%) s'appliquent à compter du 1er mai 2025. Les clauses de protection et de responsabilité (Articles 3, 4 et 5) s'appliquent depuis le début du partenariat entre les parties.",
    },
    {
      type: "paragraph",
      text: "Exception : La facture n° 1546A du 11 mai 2026 d'un montant de 15 461,40 € est expressément exclue du régime 50%/50%. Elle reste soumise à l'ancien régime applicable entre les parties, soit 10% pour le Franchisé et 90% pour le Franchiseur, conformément aux conditions en vigueur à la date d'émission de ladite facture.",
    },

    { type: "heading2", text: "SIGNATURES" },
    { type: "paragraph", text: (d) => `Fait à ${d.lieu || "Lyon"}, le ${d.date || "____ / ____ / 2025"}` },
    {
      type: "table",
      rows: [
        [
          `Pour le Franchiseur\nFINALLY ACADEMY LTD\n124-128 City Road, London EC1V 2NX\nCompany n° 16512432\nReprésentant : ${representant}\nSignature :`,
          "Pour le Franchisé\nFTRANSPORT SERVICES PRO\n86 route de Genas, 69003 Lyon\nSIRET : 823 461 561 000 18\nGuenichi Naoufal, Gérant\nSignature :",
        ],
      ],
    },
    { type: "paragraph", text: "VITD" },
    { type: "noteHeading", text: "Mention manuscrite obligatoire : « Lu et approuvé — Bon pour accord »" },
    { type: "heading2", text: "NOTE IMPORTANTE" },
    {
      type: "paragraph",
      text: "FINALLY ACADEMY LTD est une société de droit britannique non référencée sur MonCompteFormation. L'OF Référencé (FTRANSPORT SERVICES PRO) reste l'unique titulaire du référencement MCF et de la certification Qualiopi. Conformément à l'Art. 3.5 des CP OF, FTRANSPORT SERVICES PRO demeure responsable vis-à-vis de la CDC des agissements de ses partenaires, d'où les clauses d'indemnisation prévues à l'Article 3 du présent contrat.",
    },
  ];
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

  const drawText = (text: string, opts: { bold?: boolean; italic?: boolean; size?: number; align?: "left" | "center"; box?: boolean } = {}) => {
    const fontStyle = opts.bold ? "bold" : opts.italic ? "italic" : "normal";
    const fontSize = opts.size || 10;
    doc.setFont("helvetica", fontStyle);
    doc.setFontSize(fontSize);
    const width = opts.align === "center" ? maxW : maxW - (opts.box ? 6 : 0);
    const lines = text.flatMap((part) => doc.splitTextToSize(part, width));
    const lineH = fontSize >= 13 ? 6 : 5;
    const h = lines.length * lineH + (opts.box ? 7 : 0);
    ensureSpace(h + 2);
    if (opts.box) {
      doc.setDrawColor(180);
      doc.setFillColor(245, 245, 250);
      doc.rect(margin, y - 4, maxW, h, "FD");
      doc.text(lines, margin + 3, y);
    } else if (opts.align === "center") {
      doc.text(lines, pageW / 2, y, { align: "center" });
    } else {
      doc.text(lines, margin, y);
    }
    y += h + 2;
  };

  const drawTable = (rows: string[][], headerRows = 0) => {
    const colCount = Math.max(...rows.map((r) => r.length));
    const colW = maxW / colCount;
    for (const [rowIndex, row] of rows.entries()) {
      const cells = row.map((cell) => String(cell).split("\n").flatMap((part) => doc.splitTextToSize(part, colW - 6)));
      const rowH = Math.max(...cells.map((lines) => lines.length * 5 + 8), 14);
      ensureSpace(rowH);
      for (let i = 0; i < colCount; i++) {
        const x = margin + i * colW;
        if (rowIndex < headerRows) doc.setFillColor(235, 235, 240);
        else doc.setFillColor(255, 255, 255);
        doc.setDrawColor(170);
        doc.rect(x, y - 4, colW, rowH, "FD");
        doc.setFont("helvetica", rowIndex < headerRows || rowIndex >= rows.length - 2 ? "bold" : "normal");
        doc.setFontSize(9);
        doc.text(cells[i] || [], x + 3, y + 2);
      }
      y += rowH;
    }
    y += 4;
  };

  for (const block of buildContratFranchiseContent(data)) {
    if (block.type === "title") drawText(value(block.text, data), { bold: true, size: 14, align: "center" });
    if (block.type === "subtitle") drawText(value(block.text, data), { size: 10, align: "center" });
    if (block.type === "italic") drawText(value(block.text, data), { italic: true, size: 9, align: "center" });
    if (block.type === "heading2") drawText(value(block.text, data), { bold: true, size: 11 });
    if (block.type === "heading3") drawText(value(block.text, data), { bold: true, size: 10 });
    if (block.type === "paragraph") drawText(value(block.text, data));
    if (block.type === "box") drawText(value(block.text, data), { bold: true, box: true });
    if (block.type === "noteHeading") drawText(value(block.text, data), { bold: true, italic: true, size: 11 });
    if (block.type === "bullets") {
      for (const item of block.items) drawText(`• ${value(item, data)}`);
    }
    if (block.type === "table") drawTable(block.rows.map((row) => row.map((cell) => value(cell, data))), block.headerRows || 0);
  }

  const signaturePage = doc.getNumberOfPages();
  doc.setPage(signaturePage);
  const sigDataUrl = data.signatureDataUrl;
  if (sigDataUrl) {
    try {
      const sigLabel = "Signature :";
      const pages = doc.getNumberOfPages();
      for (let i = pages; i >= 1; i--) {
        doc.setPage(i);
        const pageText = (doc as any).getTextDimensions ? undefined : undefined;
      }
      doc.addImage(sigDataUrl, "PNG", margin + 3, Math.min(y, pageH - 60), 70, 28);
    } catch {
      // ignore image errors
    }
  }

  const initiales =
    (data.initiales || data.representantNom || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 4) || "—";
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const py = pageH - 10;
    doc.setDrawColor(150);
    doc.setLineWidth(0.2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text("Paraphe Franchiseur :", pageW - margin - 28, py - 1);
    doc.rect(pageW - margin - 14, py - 6, 14, 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20);
    doc.text(initiales, pageW - margin - 7, py - 0.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text("Paraphe Franchisé :", margin, py - 1);
    doc.rect(margin + 28, py - 6, 14, 8);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Page ${i} / ${totalPages}`, pageW / 2, py, { align: "center" });
    doc.setTextColor(0);
  }

  return doc.output("blob");
}
