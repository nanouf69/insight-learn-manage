import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CandidatPratique {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
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

export function generateEmargementPratiquePDF(
  date: Date,
  type: "vtc" | "taxi",
  candidats: CandidatPratique[]
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let yPos = 12;

  // ===== EN-TÊTE BANDEAU =====
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(organisme.nom, margin, 14);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Spécialiste Formations Transport", margin, 21);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FEUILLE D'ÉMARGEMENT", pageWidth - margin, 17, { align: "right" });

  doc.setTextColor(0, 0, 0);

  // ===== TITRE FORMATION PRATIQUE =====
  yPos = 36;
  const typeLabel = type === "vtc" ? "VTC" : "TAXI";
  const typeColor: [number, number, number] = type === "vtc" ? [41, 128, 185] : [217, 119, 6];

  doc.setFillColor(...typeColor);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 16, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`FORMATION PRATIQUE ${typeLabel}`, pageWidth / 2, yPos + 11, { align: "center" });

  doc.setTextColor(0, 0, 0);

  // ===== INFORMATIONS =====
  yPos = 58;
  const dateStr = format(date, "EEEE dd MMMM yyyy", { locale: fr });
  const dateCapitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 3, 3);

  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(41, 128, 185);
  doc.text("Date :", margin + 5, yPos);
  doc.setTextColor(0, 0, 0);
  doc.text(dateCapitalized, margin + 20, yPos);

  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Lieu :", margin + 5, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(LIEU_FORMATION, margin + 18, yPos);

  // ===== LISTE DES CANDIDATS =====
  yPos = 86;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(41, 128, 185);
  doc.text(`Candidats (${candidats.length})`, margin, yPos);
  doc.setTextColor(0, 0, 0);

  yPos += 4;

  const candidatRows = candidats.map((c, i) => [
    String(i + 1),
    `${c.nom.toUpperCase()} ${c.prenom}`,
    c.telephone || "-",
    c.email || "-",
  ]);

  // Ligne vide supplémentaire au cas où un élève a été oublié
  candidatRows.push(["", "", "", ""]);

  autoTable(doc, {
    startY: yPos,
    head: [["N°", "Nom Prénom", "Téléphone", "Email"]],
    body: candidatRows,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: [41, 128, 185],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 55, fontStyle: "bold" },
      2: { cellWidth: 35, halign: "center" },
      3: { cellWidth: 70 },
    },
    margin: { left: margin, right: margin },
  });

  const afterCandidats = (doc as any).lastAutoTable.finalY + 8;

  // ===== TABLEAU D'ÉMARGEMENT =====
  const emargementRows = candidats.map((c) => [
    `${c.nom.toUpperCase()} ${c.prenom}`,
    "09h00 - 12h00",
    "",
    "13h00 - 16h00",
    "",
  ]);

  // Ligne vide supplémentaire au cas où un élève a été oublié
  emargementRows.push([
    "",
    "09h00 - 12h00",
    "",
    "13h00 - 16h00",
    "",
  ]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(41, 128, 185);
  doc.text("Émargement", margin, afterCandidats);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: afterCandidats + 4,
    head: [
      [
        { content: "Stagiaire", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "MATIN", colSpan: 2, styles: { halign: "center" } },
        { content: "APRÈS-MIDI", colSpan: 2, styles: { halign: "center" } },
      ],
      ["Horaire", "Signature", "Horaire", "Signature"],
    ],
    body: emargementRows,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 4,
      valign: "middle",
      lineColor: [41, 128, 185],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 5,
    },
    bodyStyles: {
      minCellHeight: 20,
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" },
      1: { cellWidth: 28, halign: "center", fontSize: 8 },
      2: { cellWidth: 40, halign: "center" },
      3: { cellWidth: 28, halign: "center", fontSize: 8 },
      4: { cellWidth: 40, halign: "center" },
    },
    margin: { left: margin, right: margin },
  });

  // ===== PIED DE PAGE =====
  const footerY = doc.internal.pageSize.getHeight() - 18;
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text(organisme.nom, pageWidth / 2, footerY, { align: "center" });

  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.text(organisme.adresse, pageWidth / 2, footerY + 4, { align: "center" });
  doc.text(
    `Tél. ${organisme.telephone} – ${organisme.email}`,
    pageWidth / 2,
    footerY + 8,
    { align: "center" }
  );
  doc.setFontSize(7);
  doc.text(
    `SIRET ${organisme.siret} – NAF ${organisme.codeNaf} – N° Déclaration ${organisme.numeroDeclaration}`,
    pageWidth / 2,
    footerY + 12,
    { align: "center" }
  );

  // Télécharger
  const fileName = `emargement_pratique_${typeLabel}_${format(date, "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}
