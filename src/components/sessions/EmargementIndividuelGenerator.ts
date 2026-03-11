import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, eachDayOfInterval, parseISO, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";
import logoImage from "@/assets/logo-ftransport.png";

interface Apprenant {
  nom: string;
  prenom: string;
}

interface SessionData {
  formation: string;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  formateurs: string[];
}

const organisme = {
  nom: "FTRANSPORT",
  adresse: "86 route de genas 69003 Lyon",
  telephone: "04 28 29 60 91",
  email: "contact@ftransport.fr",
  siret: "82346156100016",
  codeNaf: "8559B",
  numeroDeclaration: "823461561",
};

const LIEU_FORMATION = "86 route de genas 69003 Lyon";

export function generateEmargementIndividuelPDF(
  session: SessionData,
  apprenant: Apprenant
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const dateDebut = parseISO(session.dateDebut);
  const dateFin = parseISO(session.dateFin);
  const allDays = eachDayOfInterval({ start: dateDebut, end: dateFin });
  const workingDays = allDays.filter((day) => !isWeekend(day));

  const daysPerPage = 5;
  const totalPages = Math.ceil(workingDays.length / daysPerPage);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    if (pageIndex > 0) doc.addPage();

    const pageDays = workingDays.slice(
      pageIndex * daysPerPage,
      (pageIndex + 1) * daysPerPage
    );

    generateIndividualPage(doc, session, apprenant, pageDays, pageIndex + 1, totalPages);
  }

  const fileName = `emargement_${apprenant.nom.toUpperCase()}_${apprenant.prenom}_${format(dateDebut, "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}

function generateIndividualPage(
  doc: jsPDF,
  session: SessionData,
  apprenant: Apprenant,
  days: Date[],
  pageNum: number,
  totalPages: number
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let yPos = 10;

  // ===== EN-TÊTE BANDEAU =====
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 22, "F");

  try {
    doc.addImage(logoImage, "PNG", margin, 3, 40, 14);
  } catch (e) {
    console.log("Logo non charge");
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(organisme.nom, margin + 43, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Specialiste Formations Transport", margin, 18);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("FEUILLE D'EMARGEMENT INDIVIDUELLE", pageWidth - margin, 14, { align: "right" });

  doc.setTextColor(0, 0, 0);

  // ===== INFORMATIONS SESSION =====
  yPos = 28;
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 28, 2, 2);

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(41, 128, 185);
  doc.text("Stagiaire :", margin + 4, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`${apprenant.nom.toUpperCase()} ${apprenant.prenom}`, margin + 28, yPos);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("Formation :", pageWidth / 2, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(session.formation, pageWidth / 2 + 28, yPos);

  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("Dates :", margin + 4, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(
    `du ${format(parseISO(session.dateDebut), "dd/MM/yyyy")} au ${format(parseISO(session.dateFin), "dd/MM/yyyy")}`,
    margin + 20,
    yPos
  );

  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("Lieu :", pageWidth / 2, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(LIEU_FORMATION, pageWidth / 2 + 14, yPos);

  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("Formateur(s) :", margin + 4, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(session.formateurs.join(", "), margin + 36, yPos);

  if (totalPages > 1) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text(`Page ${pageNum} / ${totalPages}`, pageWidth - margin - 2, yPos, { align: "right" });
  }

  // ===== TABLEAU D'ÉMARGEMENT =====
  yPos = 62;

  const headRow1: any[] = [
    { content: "Jour", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
    { content: "Matin (09h00 - 12h00)", colSpan: 2, styles: { halign: "center" } },
    { content: "Apres-midi (13h00 - 16h00)", colSpan: 2, styles: { halign: "center" } },
  ];

  const headRow2: any[] = [
    { content: "Horaire", styles: { halign: "center", fontSize: 7 } },
    { content: "Signature du stagiaire", styles: { halign: "center", fontSize: 7 } },
    { content: "Horaire", styles: { halign: "center", fontSize: 7 } },
    { content: "Signature du stagiaire", styles: { halign: "center", fontSize: 7 } },
  ];

  const tableData = days.map((day) => {
    const dateStr = format(day, "EEEE dd MMMM yyyy", { locale: fr });
    const dateCapitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    return [dateCapitalized, "09h00 - 12h00", "", "13h00 - 16h00", ""];
  });

  const availableWidth = pageWidth - margin * 2;
  const jourWidth = 55;
  const horaireWidth = 30;
  const sigWidth = (availableWidth - jourWidth - horaireWidth * 2) / 2;

  autoTable(doc, {
    startY: yPos,
    head: [headRow1, headRow2],
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      valign: "middle",
      lineColor: [41, 128, 185],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 4,
    },
    bodyStyles: {
      minCellHeight: 18,
    },
    columnStyles: {
      0: { cellWidth: jourWidth, fontStyle: "bold", fontSize: 9 },
      1: { cellWidth: horaireWidth, halign: "center", fontSize: 8 },
      2: { cellWidth: sigWidth, halign: "center" },
      3: { cellWidth: horaireWidth, halign: "center", fontSize: 8 },
      4: { cellWidth: sigWidth, halign: "center" },
    },
    margin: { left: margin, right: margin },
    tableLineColor: [41, 128, 185],
    tableLineWidth: 0.5,
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  yPos = finalY + 10;

  // ===== ZONE DE SIGNATURE =====
  const colWidth = (pageWidth - margin * 2 - 10) / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Signature du stagiaire", margin, yPos);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos + 2, colWidth, 25, 2, 2);

  doc.text("Cachet et signature du centre", margin + colWidth + 10, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Fait a Lyon, le _______________`, margin + colWidth + 10, yPos + 8);
  doc.roundedRect(margin + colWidth + 10, yPos + 2, colWidth, 25, 2, 2);

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
