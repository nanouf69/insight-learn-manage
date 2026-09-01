import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logoImage from "@/assets/logo-ftransport.png";
import tamponImage from "@/assets/tampon-entreprise.png";
import { resolveFormateurSignature } from "@/lib/formateurSignature";



interface CandidatPratique {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  /** Signature numérique (data URL PNG) collectée sur la plateforme apprenant */
  signatureMatin?: string | null;
  signatureApresMidi?: string | null;
  absentMatin?: boolean;
  absentApresMidi?: boolean;
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

function formatCreneau(raw?: string): string {
  if (!raw) return "";
  // Accepts "9h-12h", "9h–12h", "13h-17h30", etc. → "09h00 - 12h00"
  const cleaned = raw.replace(/\s+/g, "").replace(/[–—]/g, "-");
  const parts = cleaned.split("-");
  if (parts.length !== 2) return raw;
  const expand = (p: string) => {
    const m = p.match(/^(\d{1,2})h(\d{0,2})$/i);
    if (!m) return p;
    const hh = m[1].padStart(2, "0");
    const mm = (m[2] || "").padStart(2, "0");
    return `${hh}h${mm}`;
  };
  return `${expand(parts[0])} - ${expand(parts[1])}`;
}

export function generateEmargementPratiquePDF(
  date: Date,
  type: "vtc" | "taxi",
  candidats: CandidatPratique[],
  creneaux?: { matin?: string; apresmidi?: string },
  formateur?: string
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let yPos = 12;

  // ===== EN-TÊTE BANDEAU =====
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Logo Ftransport
  try {
    doc.addImage(logoImage, "PNG", margin, 4, 45, 16);
  } catch (e) {
    console.log("Logo non charge");
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(organisme.nom, margin + 48, 14);

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
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 28, 3, 3);

  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(41, 128, 185);
  doc.text("Date :", margin + 5, yPos);
  doc.setTextColor(0, 0, 0);
  doc.text(dateCapitalized, margin + 20, yPos);

  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("Lieu :", margin + 5, yPos);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(LIEU_FORMATION, margin + 18, yPos);

  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("Formateur :", margin + 5, yPos);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const formateurLabel = formateur || (type === "taxi" ? "Rim TOUIL" : "Naoufal GUENICHI");
  doc.text(formateurLabel, margin + 32, yPos);

  // ===== LISTE DES CANDIDATS =====
  yPos = 94;
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

  const matinLabel = formatCreneau(creneaux?.matin) || "";
  const apresLabel = formatCreneau(creneaux?.apresmidi) || "";

  // ===== TABLEAU D'ÉMARGEMENT =====
  const emargementRows = candidats.map((c) => [
    `${c.nom.toUpperCase()} ${c.prenom}`,
    matinLabel || "—",
    c.absentMatin ? "ABSENT" : "",
    apresLabel || "—",
    c.absentApresMidi ? "ABSENT" : "",
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
    // Injection des signatures numériques déjà collectées côté apprenant
    didDrawCell: (data: any) => {
      if (data.section !== "body") return;
      if (data.column.index !== 2 && data.column.index !== 4) return;
      const cand = candidats[data.row.index];
      if (!cand) return;
      const sig = data.column.index === 2 ? cand.signatureMatin : cand.signatureApresMidi;
      if (!sig || !String(sig).startsWith("data:image")) return;
      try {
        const w = Math.min(data.cell.width - 6, 34);
        const h = Math.min(data.cell.height - 4, 14);
        doc.addImage(
          String(sig),
          "PNG",
          data.cell.x + (data.cell.width - w) / 2,
          data.cell.y + (data.cell.height - h) / 2,
          w,
          h,
        );
      } catch (e) {
        console.log("Signature non rendue", e);
      }
    },
  });

  let afterEmargement = (doc as any).lastAutoTable.finalY + 6;

  const signedCount = candidats.filter((c) => c.signatureMatin || c.signatureApresMidi).length;
  if (signedCount > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80, 80, 80);
    doc.text(
      "Signatures recueillies électroniquement par l'apprenant sur la plateforme FTRANSPORT (horodatées).",
      margin,
      afterEmargement,
    );
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    afterEmargement += 8;
  }

  // ===== ZONE FORMATEUR / CACHET DU CENTRE (identique à la feuille individuelle) =====
  const pageH = doc.internal.pageSize.getHeight();
  const sigBoxH = 28;
  // Si la place manque en bas de page, on bascule le bloc sur une nouvelle page
  if (afterEmargement + sigBoxH + 12 > pageH - 30) {
    doc.addPage();
    afterEmargement = 24;
  }
  const sigY = afterEmargement + 4;
  const colWidth = (pageWidth - margin * 2 - 10) / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text("Signature du formateur", margin, sigY);
  doc.text("Cachet et signature du centre", margin + colWidth + 10, sigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(formateurLabel, margin + 2, sigY + 6);
  doc.text(`Fait à Lyon, le ${format(date, "dd/MM/yyyy")}`, margin + colWidth + 12, sigY + 6);

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, sigY + 2, colWidth, sigBoxH, 2, 2);
  doc.roundedRect(margin + colWidth + 10, sigY + 2, colWidth, sigBoxH, 2, 2);

  // Signature du formateur (gère les noms multiples "A / B", "A et B")
  const formateurCandidates = formateurLabel
    .split(/\s*(?:\/|,| et )\s*/i)
    .filter((n) => n.trim().length > 0);
  const { signature: formateurSig } = resolveFormateurSignature(formateurCandidates);
  if (formateurSig) {
    try {
      const sigW = Math.min(55, colWidth - 8);
      const sigH = 18;
      doc.addImage(
        formateurSig,
        "PNG",
        margin + (colWidth - sigW) / 2,
        sigY + 8 + (sigBoxH - 8 - sigH) / 2,
        sigW,
        sigH,
      );
    } catch (e) {
      console.error("Erreur chargement signature formateur:", e);
    }
  }

  // Cachet de l'organisme
  try {
    const tW = Math.min(48, colWidth - 10);
    const tH = 22;
    doc.addImage(
      tamponImage,
      "PNG",
      margin + colWidth + 10 + (colWidth - tW) / 2,
      sigY + 9 + (sigBoxH - 9 - tH) / 2,
      tW,
      tH,
    );
  } catch (e) {
    console.log("Tampon non chargé");
  }



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
  const blob = doc.output("blob") as Blob;
  doc.save(fileName);
  return { blob, fileName };
}
