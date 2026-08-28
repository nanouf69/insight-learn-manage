import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import logoImage from "@/assets/logo-ftransport.png";
import { SIGNATURE_NAOUFAL_DATA_URL } from "@/lib/signatureNaoufal";

interface Apprenant {
  nom: string;
  prenom: string;
  type_apprenant?: string;
  telephone?: string;
}

export interface AgendaDaySlot {
  date: Date;
  matinDebut?: string;
  matinFin?: string;
  apremDebut?: string;
  apremFin?: string;
  isSoir?: boolean;
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

  const pdfBlob = doc.output("blob") as Blob;

  if (options?.print) {
    const url = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(url);
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        printWindow.print();
      });
    }
  } else {
    doc.save(fileName);
  }
  return { blob: pdfBlob, fileName };
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
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(organisme.nom, margin + 43, 11);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Specialiste Formations Transport", margin + 43, 17);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("FEUILLE D'EMARGEMENT INDIVIDUELLE", pageWidth - margin, 14, { align: "right" });

  doc.setTextColor(0, 0, 0);

  // ===== INFORMATIONS SESSION =====
  yPos = 28;
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 28, 2, 2);

  // Mise en page en 2 colonnes strictes pour eviter tout chevauchement
  const colLeftX = margin + 4;
  const colRightX = pageWidth / 2 + 2;
  const infoColWidth = pageWidth / 2 - margin - 8;

  const fit = (text: string, maxWidth: number, size: number) => {
    doc.setFontSize(size);
    let t = text || "";
    if (doc.getTextWidth(t) <= maxWidth) return t;
    while (t.length > 3 && doc.getTextWidth(t + "...") > maxWidth) t = t.slice(0, -1);
    return t + "...";
  };

  const drawField = (label: string, value: string, x: number, y: number, size = 10) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(41, 128, 185);
    doc.text(label, x, y);
    const labelW = doc.getTextWidth(label) + 3;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    const maxW = infoColWidth - labelW;
    const txt = fit(value, maxW, size);
    doc.setFontSize(size);
    doc.text(txt, x + labelW, y);
  };

  const typeLabel = (apprenant.type_apprenant || '').toUpperCase().replace(/-E$/i, '');
  const formationWithType = typeLabel ? `${session.formation} (${typeLabel})` : session.formation;

  let lineY = yPos + 7;
  drawField("Stagiaire :", `${apprenant.nom.toUpperCase()} ${apprenant.prenom}`, colLeftX, lineY, 11);
  if (apprenant.telephone) {
    drawField("Tel :", apprenant.telephone, colRightX, lineY);
  }

  lineY += 7;
  drawField("Formation :", formationWithType, colLeftX, lineY);
  drawField("Lieu :", LIEU_FORMATION, colRightX, lineY);

  lineY += 7;
  drawField(
    "Dates :",
    `du ${format(parseISO(session.dateDebut), "dd/MM/yyyy")} au ${format(parseISO(session.dateFin), "dd/MM/yyyy")}`,
    colLeftX,
    lineY
  );
  drawField("Formateur(s) :", session.formateurs.join(", "), colRightX, lineY);

  if (totalPages > 1) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`Page ${pageNum} / ${totalPages}`, pageWidth - margin - 2, yPos + 26, { align: "right" });
  }


  // ===== TABLEAU D'ÉMARGEMENT =====
  yPos = 62;

  const pageHeight = doc.internal.pageSize.getHeight();
  const footerZoneHeight = 45; // signature (30) + footer (15)
  const maxTableBottom = pageHeight - footerZoneHeight;

  const allSoir = days.length > 0 && days.every((d) => d.isSoir);
  const headRow1: any[] = [
    { content: "Jour", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
    { content: allSoir ? "Soir (1ere partie)" : "Matin", colSpan: 2, styles: { halign: "center" } },
    { content: allSoir ? "Soir (2eme partie)" : "Apres-midi", colSpan: 2, styles: { halign: "center" } },
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
  yPos = finalY + 6;

  // Mention légale : case cochée par l'apprenant lors de chaque signature
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(
    `☑ Pour chaque signature, l'apprenant a coché la case : « Je confirme que je suis bien au lieu de formation ».`,
    margin, yPos, { maxWidth: pageWidth - margin * 2 }
  );
  yPos += 8;

  // ===== ZONE DE SIGNATURE =====
  const pgH = doc.internal.pageSize.getHeight();
  const sigY = Math.min(yPos, pgH - 50);
  const colWidth = (pageWidth - margin * 2 - 10) / 2;
  const sigBoxH = 28;

  // Date du dernier jour de formation (2e jour pour FC VTC/TAXI 14h)
  const lastDay = days[days.length - 1]?.date || parseISO(session.dateFin);
  const dateSignature = format(lastDay, "dd/MM/yyyy");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text("Formateur", margin, sigY);
  doc.text("Cachet et signature du centre", margin + colWidth + 10, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Naoufal GUENICHI", margin + 2, sigY + 6);
  doc.text(`Fait a Lyon, le ${dateSignature}`, margin + colWidth + 12, sigY + 6);

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, sigY + 2, colWidth, sigBoxH, 2, 2);
  doc.roundedRect(margin + colWidth + 10, sigY + 2, colWidth, sigBoxH, 2, 2);

  // Signature de Naoufal (image large et bien visible, centrée dans le cadre)
  try {
    const sigW = 60;
    const sigH = 22;
    const sigX = margin + (colWidth - sigW) / 2;
    const sigImgY = sigY + 8 + (sigBoxH - 8 - sigH) / 2;
    doc.addImage(SIGNATURE_NAOUFAL_DATA_URL, "PNG", sigX, sigImgY, sigW, sigH);
  } catch (e) {
    console.error("Erreur chargement signature Naoufal:", e);
  }

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
