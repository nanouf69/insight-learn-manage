import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "@/assets/logo-ftransport.png";

interface BlocCours {
  discipline_nom: string;
  formation: string;
  heure_debut: string;
  heure_fin: string;
  discipline_color?: string | null;
}

interface Params {
  formateurNom: string;
  date: Date; // jour précis
  blocs: BlocCours[];
  signatureDataUrl?: string | null;
  signedAt?: Date | null;
}

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const LIEU = "86 route de Genas, 69003 Lyon";

export function generateEmargementFormateurJour({ formateurNom, date, blocs }: Params) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 12;

  // Bandeau
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 24, "F");
  try {
    doc.addImage(logoImage, "PNG", margin, 4, 32, 16);
  } catch {}
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("FEUILLE D'ÉMARGEMENT FORMATEUR", pageWidth / 2, 11, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("FTRANSPORT — Organisme de formation", pageWidth / 2, 18, { align: "center" });

  y = 32;
  doc.setTextColor(0, 0, 0);

  // Infos en-tête
  const dateLabel = `${JOURS[date.getDay()]} ${date.getDate()} ${MOIS[date.getMonth()]} ${date.getFullYear()}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Formateur :", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(formateurNom, margin + 28, y);

  doc.setFont("helvetica", "bold");
  doc.text("Date :", pageWidth - margin - 70, y);
  doc.setFont("helvetica", "normal");
  doc.text(dateLabel, pageWidth - margin - 55, y);

  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Lieu :", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(LIEU, margin + 28, y);

  y += 10;

  // Tableau des cours du jour
  const rows = blocs
    .slice()
    .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
    .map((b) => {
      const [sh, sm] = b.heure_debut.split(":").map(Number);
      const [eh, em] = b.heure_fin.split(":").map(Number);
      const heures = (eh + em / 60) - (sh + sm / 60);
      return [
        `${b.heure_debut} – ${b.heure_fin}`,
        `${heures.toFixed(1)} h`,
        b.discipline_nom || "",
        b.formation || "",
        "", // Signature début
        "", // Signature fin
      ];
    });

  autoTable(doc, {
    startY: y,
    head: [["Horaires", "Durée", "Discipline / Cours", "Formation", "Signature début", "Signature fin"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3, valign: "middle", minCellHeight: 18 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: "center" },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      1: { cellWidth: 16, halign: "center" },
      2: { cellWidth: 42 },
      3: { cellWidth: 42 },
      4: { cellWidth: 28 },
      5: { cellWidth: 28 },
    },
    margin: { left: margin, right: margin },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 12;

  // Cadre signature globale
  if (finalY > 240) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Attestation du formateur :", margin, finalY);
  finalY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const txt =
    "Je soussigné(e) " + formateurNom + ", certifie avoir assuré les sessions de formation indiquées ci-dessus, " +
    "à la date du " + dateLabel + ", au sein de l'organisme FTRANSPORT.";
  doc.text(doc.splitTextToSize(txt, pageWidth - margin * 2), margin, finalY);
  finalY += 16;

  doc.setFont("helvetica", "bold");
  doc.text("Signature du formateur :", margin, finalY);
  doc.rect(margin, finalY + 2, 80, 28);

  doc.text("Cachet de l'organisme :", pageWidth - margin - 80, finalY);
  doc.rect(pageWidth - margin - 80, finalY + 2, 80, 28);

  // Pied
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "FTRANSPORT — 86 route de Genas, 69003 Lyon — SIRET 823 461 561 00016 — Déclaration d'activité 823461561",
    pageWidth / 2,
    285,
    { align: "center" }
  );

  const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const safeName = formateurNom.replace(/[^a-z0-9]+/gi, "_");
  doc.save(`emargement_formateur_${safeName}_${ymd}.pdf`);
}
