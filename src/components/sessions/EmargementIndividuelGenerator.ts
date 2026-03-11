import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import logoImage from "@/assets/logo-ftransport.png";

interface Apprenant {
  nom: string;
  prenom: string;
  type_apprenant?: string;
}

export interface AgendaDaySlot {
  date: Date;
  matinDebut?: string;
  matinFin?: string;
  apremDebut?: string;
  apremFin?: string;
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
  apprenant: Apprenant,
  agendaDays: AgendaDaySlot[],
  options?: { print?: boolean }
): void;
export function generateEmargementIndividuelPDF(
  session: SessionData,
  apprenant: Apprenant,
  agendaDays: AgendaDaySlot[]
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  if (agendaDays.length === 0) return;

  const daysPerPage = 4;
  const totalPages = Math.ceil(agendaDays.length / daysPerPage);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    if (pageIndex > 0) doc.addPage();

    const pageDays = agendaDays.slice(
      pageIndex * daysPerPage,
      (pageIndex + 1) * daysPerPage
    );

    generateIndividualPage(doc, session, apprenant, pageDays, pageIndex + 1, totalPages);
  }

  const dateDebut = parseISO(session.dateDebut);
  const fileName = `emargement_${apprenant.nom.toUpperCase()}_${apprenant.prenom}_${format(dateDebut, "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}

function generateIndividualPage(
  doc: jsPDF,
  session: SessionData,
  apprenant: Apprenant,
  days: AgendaDaySlot[],
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

  const typeLabel = (apprenant.type_apprenant || '').toUpperCase().replace(/-E$/, '');
  const formationWithType = typeLabel ? `${session.formation} (${typeLabel})` : session.formation;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("Formation :", pageWidth / 2, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(formationWithType, pageWidth / 2 + 28, yPos);

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

  const pageHeight = doc.internal.pageSize.getHeight();
  const footerZoneHeight = 45; // signature (30) + footer (15)
  const maxTableBottom = pageHeight - footerZoneHeight;

  const headRow1: any[] = [
    { content: "Jour", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
    { content: "Matin", colSpan: 2, styles: { halign: "center" } },
    { content: "Apres-midi", colSpan: 2, styles: { halign: "center" } },
  ];

  const headRow2: any[] = [
    { content: "Horaire", styles: { halign: "center", fontSize: 7 } },
    { content: "Signature du stagiaire", styles: { halign: "center", fontSize: 7 } },
    { content: "Horaire", styles: { halign: "center", fontSize: 7 } },
    { content: "Signature du stagiaire", styles: { halign: "center", fontSize: 7 } },
  ];

  const tableData = days.map((day) => {
    const dateStr = format(day.date, "EEEE dd MMMM yyyy", { locale: fr });
    const dateCapitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    const matinLabel = day.matinDebut && day.matinFin ? `${day.matinDebut} - ${day.matinFin}` : "";
    const apremLabel = day.apremDebut && day.apremFin ? `${day.apremDebut} - ${day.apremFin}` : "";
    return [dateCapitalized, matinLabel, "", apremLabel, ""];
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
  const pgH = doc.internal.pageSize.getHeight();
  const sigY = Math.min(yPos, pgH - 42);
  const colWidth = (pageWidth - margin * 2 - 10) / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Cachet et signature du centre", margin, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Fait a Lyon, le _______________`, margin + 2, sigY + 8);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, sigY + 2, colWidth, 22, 2, 2);

  // ===== PIED DE PAGE =====
  const footerY = pgH - 8;
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text(organisme.nom, pageWidth / 2, footerY - 1, { align: "center" });

  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${organisme.adresse} | Tel. ${organisme.telephone} | ${organisme.email} | SIRET ${organisme.siret} | NAF ${organisme.codeNaf}`,
    pageWidth / 2,
    footerY + 3,
    { align: "center" }
  );
}
