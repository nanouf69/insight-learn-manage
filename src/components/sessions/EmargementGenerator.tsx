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
  const margin = 15;
  let yPos = 15;

  // En-tête
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(organisme.nom, margin, yPos);

  doc.setFontSize(14);
  doc.text("FEUILLE D'ÉMARGEMENT", pageWidth - margin, yPos, { align: "right" });

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("Spécialiste Formations Transport", margin, yPos);

  yPos += 12;
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  // Informations de la session
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Intitulé de la formation : ${session.formation}`, margin, yPos);

  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Stagiaire : ${apprenant.nom.toUpperCase()} ${apprenant.prenom}`, margin, yPos);

  yPos += 6;
  doc.text(`Formateur(s) : ${session.formateurs.join(", ")}`, margin, yPos);

  yPos += 6;
  doc.text(
    `Dates de formation : du ${format(parseISO(session.dateDebut), "dd MMMM", {
      locale: fr,
    })} au ${format(parseISO(session.dateFin), "dd MMMM yyyy", { locale: fr })}`,
    margin,
    yPos
  );

  yPos += 6;
  doc.text(`Lieu : ${session.lieu}`, margin, yPos);

  if (totalPages > 1) {
    yPos += 6;
    doc.setFont("helvetica", "italic");
    doc.text(`Page ${pageNum} / ${totalPages}`, margin, yPos);
    doc.setFont("helvetica", "normal");
  }

  // Tableau d'émargement
  yPos += 10;

  const tableData = days.map((day) => {
    const dateStr = format(day, "dd/MM/yyyy", { locale: fr });
    return [
      `Le ${dateStr} de 09h00 à 12h00`,
      "", // Signature stagiaire matin
      "", // Signature formateur matin
      "3.00 h",
      `Le ${dateStr} de 13h00 à 16h00`,
      "", // Signature stagiaire après-midi
      "", // Signature formateur après-midi
      "3.00 h",
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        { content: "MATIN", colSpan: 4, styles: { halign: "center", fillColor: [66, 139, 202] } },
        { content: "APRÈS-MIDI", colSpan: 4, styles: { halign: "center", fillColor: [66, 139, 202] } },
      ],
      ["Horaire", "Stagiaire", "Formateur", "Durée", "Horaire", "Stagiaire", "Formateur", "Durée"],
    ],
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 3,
      valign: "middle",
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 35 },
      5: { cellWidth: 20, halign: "center" },
      6: { cellWidth: 20, halign: "center" },
      7: { cellWidth: 15, halign: "center" },
    },
    margin: { left: margin, right: margin },
  });

  // Position après le tableau
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  yPos = finalY + 10;

  // Durée totale
  const totalHours = days.length * 6;
  doc.setFont("helvetica", "bold");
  doc.text(`Durée totale réalisée sur la période : ${totalHours} heures`, margin, yPos);

  // Signature
  yPos += 15;
  doc.setFont("helvetica", "normal");
  doc.text("Fait à Lyon, le __________", margin, yPos);

  yPos += 8;
  doc.text("Cachet et signature du centre de formation", margin, yPos);

  // Rectangle pour signature
  yPos += 5;
  doc.setDrawColor(200);
  doc.rect(margin, yPos, 60, 25);

  // Pied de page
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(organisme.nom, pageWidth / 2, footerY - 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(organisme.adresse, pageWidth / 2, footerY - 4, { align: "center" });
  doc.text(
    `Tél. ${organisme.telephone} – ${organisme.email}`,
    pageWidth / 2,
    footerY,
    { align: "center" }
  );
  doc.setFontSize(7);
  doc.text(
    `SIRET ${organisme.siret} – NAF ${organisme.codeNaf} – N° Déclaration ${organisme.numeroDeclaration}`,
    pageWidth / 2,
    footerY + 4,
    { align: "center" }
  );
}
