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

// Données de l'organisme (à connecter à la base de données plus tard)
const organisme: OrganismeData = {
  nom: "FTRANSPORT",
  adresse: "86 route de genas 69003 Lyon",
  telephone: "04 28 29 60 91",
  email: "contact@ftransport.fr",
  siret: "82346156100016",
  codeNaf: "8559B",
  numeroDeclaration: "823461561",
};

// Lieu de formation fixe
const LIEU_FORMATION = "86 route de genas 69003 Lyon";

export function generateEmargementPDF(
  session: SessionData,
  apprenants: Apprenant[]
) {
  const doc = new jsPDF({
    orientation: "portrait",
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

  apprenants.forEach((apprenant, apprenantIndex) => {
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (apprenantIndex > 0 || pageIndex > 0) {
        doc.addPage();
      }

      const pageDays = workingDays.slice(
        pageIndex * daysPerPage,
        (pageIndex + 1) * daysPerPage
      );

      generatePage(doc, session, apprenant, pageDays, pageIndex + 1, totalPages);
    }
  });

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
  apprenant: Apprenant,
  days: Date[],
  pageNum: number,
  totalPages: number
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let yPos = 12;

  // ===== EN-TÊTE AVEC BANDEAU =====
  // Bandeau de couleur en haut
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Logo / Nom de l'organisme
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(organisme.nom, margin, 14);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Spécialiste Formations Transport", margin, 21);

  // Titre du document
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FEUILLE D'ÉMARGEMENT", pageWidth - margin, 17, { align: "right" });

  // Reset couleur texte
  doc.setTextColor(0, 0, 0);

  // ===== INFORMATIONS DE LA SESSION =====
  yPos = 38;

  // Cadre pour les informations
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 42, 3, 3);

  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(41, 128, 185);
  doc.text("Intitulé de la formation :", margin + 5, yPos);
  doc.setTextColor(0, 0, 0);
  doc.text(session.formation, margin + 55, yPos);

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Stagiaire :", margin + 5, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${apprenant.nom.toUpperCase()} ${apprenant.prenom}`, margin + 30, yPos);

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Formateur(s) :", margin + 5, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(session.formateurs.join(", "), margin + 35, yPos);

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Dates :", margin + 5, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(
    `du ${format(parseISO(session.dateDebut), "dd MMMM", { locale: fr })} au ${format(parseISO(session.dateFin), "dd MMMM yyyy", { locale: fr })}`,
    margin + 22,
    yPos
  );

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Lieu :", margin + 5, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(LIEU_FORMATION, margin + 18, yPos);

  if (totalPages > 1) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(`Page ${pageNum} / ${totalPages}`, pageWidth - margin - 5, yPos, { align: "right" });
  }

  // ===== TABLEAU D'ÉMARGEMENT =====
  yPos = 88;

  const tableData = days.map((day) => {
    const dateStr = format(day, "EEEE dd/MM", { locale: fr });
    const dateCapitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    return [
      dateCapitalized,
      "09h00 - 12h00",
      "", // Signature stagiaire matin
      "", // Signature formateur matin
      "13h00 - 16h00",
      "", // Signature stagiaire après-midi
      "", // Signature formateur après-midi
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        { content: "Date", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "MATIN", colSpan: 3, styles: { halign: "center" } },
        { content: "APRÈS-MIDI", colSpan: 3, styles: { halign: "center" } },
      ],
      ["Horaire", "Signature\nStagiaire", "Signature\nFormateur", "Horaire", "Signature\nStagiaire", "Signature\nFormateur"],
    ],
    body: tableData,
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
      minCellHeight: 18,
    },
    columnStyles: {
      0: { cellWidth: 32, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 24, halign: "center", fontSize: 8 },
      2: { cellWidth: 28, halign: "center" },
      3: { cellWidth: 28, halign: "center" },
      4: { cellWidth: 24, halign: "center", fontSize: 8 },
      5: { cellWidth: 28, halign: "center" },
      6: { cellWidth: 28, halign: "center" },
    },
    margin: { left: margin, right: margin },
    tableLineColor: [41, 128, 185],
    tableLineWidth: 0.5,
  });

  // Position après le tableau
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  yPos = finalY + 12;

  // ===== DURÉE TOTALE =====
  const totalHours = days.length * 6;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPos - 4, 100, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Durée totale réalisée : ${totalHours} heures`, margin + 5, yPos + 3);

  // ===== ZONE DE SIGNATURE =====
  yPos += 20;
  
  // Deux colonnes pour signatures
  const colWidth = (pageWidth - margin * 2 - 10) / 2;
  
  // Signature stagiaire
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Signature du stagiaire", margin, yPos);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("(précédée de la mention 'Lu et approuvé')", margin, yPos + 5);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos + 8, colWidth, 28, 2, 2);

  // Signature centre de formation
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Cachet et signature du centre", margin + colWidth + 10, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Fait à Lyon, le _______________`, margin + colWidth + 10, yPos + 5);
  doc.roundedRect(margin + colWidth + 10, yPos + 8, colWidth, 28, 2, 2);

  // ===== PIED DE PAGE =====
  const footerY = doc.internal.pageSize.getHeight() - 18;
  
  // Ligne de séparation
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
}
