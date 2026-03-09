import jsPDF from 'jspdf';

interface RecapitulatifData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  numeroDossier: string;
  typeExamen: string;
  dateExamen: string;
  lieuExamen?: string;
  b2Vierge: boolean;
  motDePasseCma?: string;
}

export function generateRecapitulatifPDF(data: RecapitulatifData, options?: { returnBlob?: boolean }): Blob | void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // En-tête
  doc.setFillColor(59, 130, 246); // blue-500
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('FTRANSPORT', margin, 25);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Récapitulatif de votre inscription', margin, 35);

  yPos = 55;
  doc.setTextColor(0, 0, 0);

  // Date de génération
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const dateGeneration = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Document généré le ${dateGeneration}`, margin, yPos);
  yPos += 15;

  // Section Coordonnées
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('VOS COORDONNÉES', margin, yPos);
  yPos += 2;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const addField = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label} :`, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '-', margin + 50, yPos);
    yPos += 8;
  };

  addField('Nom', data.nom);
  addField('Prénom', data.prenom);
  addField('Email', data.email);
  addField('Téléphone', data.telephone);

  yPos += 10;

  // Section Dossier CMA
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DOSSIER CMA', margin, yPos);
  yPos += 2;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  addField('N° Dossier', data.numeroDossier);
  if (data.motDePasseCma) {
    addField('Mot de passe CMA', data.motDePasseCma);
  }

  yPos += 10;

  // Section Examen
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS EXAMEN', margin, yPos);
  yPos += 2;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  addField('Type', data.typeExamen);
  addField('Date', data.dateExamen);
  
  if (data.lieuExamen) {
    doc.setFont('helvetica', 'bold');
    doc.text('Lieu :', margin, yPos);
    doc.setFont('helvetica', 'normal');
    
    // Handle long lieu text with wrapping
    const lieuLines = doc.splitTextToSize(data.lieuExamen, pageWidth - margin - 55);
    doc.text(lieuLines, margin + 50, yPos);
    yPos += lieuLines.length * 6 + 2;
  }

  yPos += 10;

  // Section Casier judiciaire
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CASIER JUDICIAIRE (B2)', margin, yPos);
  yPos += 2;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  
  if (data.b2Vierge) {
    doc.setFillColor(34, 197, 94); // green-500
    doc.circle(margin + 3, yPos - 2, 3, 'F');
    doc.setTextColor(34, 197, 94);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ B2 vierge confirmé', margin + 10, yPos);
  } else {
    doc.setFillColor(239, 68, 68); // red-500
    doc.circle(margin + 3, yPos - 2, 3, 'F');
    doc.setTextColor(239, 68, 68);
    doc.setFont('helvetica', 'bold');
    doc.text('✗ B2 non confirmé', margin + 10, yPos);
  }

  yPos += 20;

  // Encadré important
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(251, 191, 36); // amber-400
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'FD');
  
  yPos += 8;
  doc.setTextColor(146, 64, 14); // amber-800
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTANT', margin + 5, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  const importantText = "Ne payez pas les frais d'examen si dans votre formule CPF il est écrit \"avec frais d'examen\". En cas de réussite à l'épreuve d'admissibilité, contactez-nous dans les 48h.";
  const importantLines = doc.splitTextToSize(importantText, pageWidth - 2 * margin - 10);
  doc.text(importantLines, margin + 5, yPos);

  // Pied de page
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('FTRANSPORT - 86 Route de Genas, 69003 Lyon', margin, footerY);
  doc.text('Tél : 04.28.29.60.91 • contact@ftransport.fr', margin, footerY + 5);

  // Téléchargement ou retour du blob
  const fileName = `Recapitulatif_Inscription_${data.nom}_${data.prenom}.pdf`.replace(/\s+/g, '_');
  
  if (options?.returnBlob) {
    return doc.output('blob');
  }
  
  doc.save(fileName);
}