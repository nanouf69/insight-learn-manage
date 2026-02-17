import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, eachDayOfInterval, parseISO, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";

interface Apprenant {
  id: number;
  nom: string;
  prenom: string;
}

interface SessionData {
  title: string;
  formation: string;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  formateurs: string[];
}

interface OrganismeData {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  siret: string;
  codeNaf: string;
  numeroDeclaration: string;
}

// Données de l'organisme
const organisme: OrganismeData = {
  nom: "FTRANSPORT",
  adresse: "86 route de genas 69003 Lyon",
  telephone: "04 28 29 60 91",
  email: "contact@ftransport.fr",
  siret: "82346156100016",
  codeNaf: "8559B",
  numeroDeclaration: "823461561",
};

const LIEU_FORMATION = "86 route de genas 69003 Lyon";

export function generateEmargementPDF(
  session: SessionData,
  apprenants: Apprenant[]
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Calculer les jours de formation (hors week-end)
  const dateDebut = parseISO(session.dateDebut);
  const dateFin = parseISO(session.dateFin);
  const allDays = eachDayOfInterval({ start: dateDebut, end: dateFin });
  const workingDays = allDays.filter((day) => !isWeekend(day));

  // Grouper par semaines de 5 jours max par page
  const daysPerPage = 5;
  const totalPages = Math.ceil(workingDays.length / daysPerPage);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    if (pageIndex > 0) {
      doc.addPage();
    }

    const pageDays = workingDays.slice(
      pageIndex * daysPerPage,
      (pageIndex + 1) * daysPerPage
    );

    generatePage(doc, session, apprenants, pageDays, pageIndex + 1, totalPages);
  }

  // Télécharger le PDF
  const fileName = `emargement_${session.formation.replace(/\s+/g, "_")}_${format(
    dateDebut,
    "yyyy-MM-dd"
  )}.pdf`;
  doc.save(fileName);
}

function generatePage(
  doc: jsPDF,
  session: SessionData,
  apprenants: Apprenant[],
  days: Date[],
  pageNum: number,
  totalPages: number
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let yPos = 10;

  // ===== EN-TÊTE AVEC BANDEAU =====
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(organisme.nom, margin, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Specialiste Formations Transport", margin, 18);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("FEUILLE D'EMARGEMENT", pageWidth - margin, 14, { align: "right" });

  doc.setTextColor(0, 0, 0);

  // ===== INFORMATIONS DE LA SESSION =====
  yPos = 28;

  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 22, 2, 2);

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(41, 128, 185);
  doc.text("Formation :", margin + 4, yPos);
  doc.setTextColor(0, 0, 0);
  doc.text(session.formation, margin + 32, yPos);

  doc.setFont("helvetica", "bold");
  doc.text("Formateur(s) :", pageWidth / 2, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(session.formateurs.join(", "), pageWidth / 2 + 32, yPos);

  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Dates :", margin + 4, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(
    `du ${format(parseISO(session.dateDebut), "dd/MM/yyyy")} au ${format(parseISO(session.dateFin), "dd/MM/yyyy")}`,
    margin + 20,
    yPos
  );

  doc.setFont("helvetica", "bold");
  doc.text("Lieu :", pageWidth / 2, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(LIEU_FORMATION, pageWidth / 2 + 14, yPos);

  if (totalPages > 1) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text(`Page ${pageNum} / ${totalPages}`, pageWidth - margin - 2, yPos, { align: "right" });
  }

  // ===== TABLEAU D'ÉMARGEMENT - TOUS LES APPRENANTS =====
  yPos = 55;

  // Construire les colonnes dynamiquement selon les jours
  const headRow1: any[] = [
    { content: "N°", rowSpan: 2, styles: { halign: "center", valign: "middle", cellWidth: 8 } },
    { content: "Nom & Prenom", rowSpan: 2, styles: { halign: "center", valign: "middle", cellWidth: 38 } },
  ];

  const headRow2: any[] = [];

  days.forEach((day) => {
    const dateStr = format(day, "EEE dd/MM", { locale: fr });
    const dateCapitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    headRow1.push({
      content: dateCapitalized,
      colSpan: 2,
      styles: { halign: "center", fontSize: 7 },
    });
    headRow2.push({ content: "Matin", styles: { halign: "center", fontSize: 6 } });
    headRow2.push({ content: "Apres-midi", styles: { halign: "center", fontSize: 6 } });
  });

  // Construire les lignes avec tous les apprenants
  const tableData = apprenants.map((apprenant, index) => {
    const row: string[] = [
      String(index + 1),
      `${apprenant.nom.toUpperCase()} ${apprenant.prenom}`,
    ];
    // 2 colonnes vides (matin + après-midi) par jour pour signature
    days.forEach(() => {
      row.push(""); // matin
      row.push(""); // après-midi
    });
    return row;
  });

  const totalCols = 2 + days.length * 2;
  const availableWidth = pageWidth - margin * 2;
  const fixedWidth = 8 + 38; // N° + Nom
  const remainingWidth = availableWidth - fixedWidth;
  const sigCellWidth = remainingWidth / (days.length * 2);

  const columnStyles: any = {
    0: { cellWidth: 8, halign: "center", fontSize: 7 },
    1: { cellWidth: 38, halign: "left", fontSize: 7, fontStyle: "bold" },
  };
  for (let i = 2; i < totalCols; i++) {
    columnStyles[i] = { cellWidth: sigCellWidth, halign: "center" };
  }

  autoTable(doc, {
    startY: yPos,
    head: [headRow1, headRow2],
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 2,
      valign: "middle",
      lineColor: [41, 128, 185],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 3,
    },
    bodyStyles: {
      minCellHeight: 12,
    },
    columnStyles,
    margin: { left: margin, right: margin },
    tableLineColor: [41, 128, 185],
    tableLineWidth: 0.5,
  });

  // Position après le tableau
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  yPos = finalY + 8;

  // ===== HORAIRES =====
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Horaires : Matin 09h00 - 12h00 / Apres-midi 13h00 - 16h00", margin, yPos);

  // ===== ZONE DE SIGNATURE =====
  yPos += 8;
  const colWidth = (pageWidth - margin * 2 - 10) / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Signature du responsable de formation", margin, yPos);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos + 2, colWidth, 20, 2, 2);

  doc.text("Cachet et signature du centre", margin + colWidth + 10, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Fait a Lyon, le _______________`, margin + colWidth + 10, yPos + 6);
  doc.roundedRect(margin + colWidth + 10, yPos + 2, colWidth, 20, 2, 2);

  // ===== PIED DE PAGE =====
  const footerY = doc.internal.pageSize.getHeight() - 10;

  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text(organisme.nom, pageWidth / 2, footerY, { align: "center" });

  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${organisme.adresse} | Tel. ${organisme.telephone} | ${organisme.email} | SIRET ${organisme.siret} | NAF ${organisme.codeNaf}`,
    pageWidth / 2,
    footerY + 4,
    { align: "center" }
  );
}
