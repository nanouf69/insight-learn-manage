import jsPDF from 'jspdf';
import logoImage from '@/assets/logo-ftransport.png';
import tamponImage from '@/assets/tampon-entreprise.png';

const MOIS_FR = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'
];

interface AttestationFCData {
  nom: string;
  prenom: string;
  dateFin: string; // YYYY-MM-DD
}

export async function generateAttestationFCVTC(data: AttestationFCData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();  // ~297
  const ph = doc.internal.pageSize.getHeight(); // ~210
  const margin = 12;

  // === BORDURE DECORATIVE ===
  // Cadre extérieur doré
  doc.setDrawColor(180, 150, 80);
  doc.setLineWidth(1.5);
  doc.rect(margin, margin, pw - margin * 2, ph - margin * 2);
  // Cadre intérieur
  doc.setLineWidth(0.5);
  doc.rect(margin + 3, margin + 3, pw - margin * 2 - 6, ph - margin * 2 - 6);

  // Petits coins décoratifs (simples)
  const cornerSize = 15;
  doc.setLineWidth(0.3);
  const corners = [
    [margin + 5, margin + 5],
    [pw - margin - 5, margin + 5],
    [margin + 5, ph - margin - 5],
    [pw - margin - 5, ph - margin - 5],
  ];
  corners.forEach(([x, y]) => {
    doc.setDrawColor(180, 150, 80);
    doc.circle(x, y, 2, 'S');
    doc.circle(x, y, 4, 'S');
  });

  // === TITRE ===
  let yPos = margin + 30;
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(32);
  doc.setFont('times', 'bold');
  doc.text('ATTESTATION DE SUIVI DE FORMATION', pw / 2, yPos, { align: 'center' });
  yPos += 16;
  doc.text('CONTINUE', pw / 2, yPos, { align: 'center' });

  // === DESTINEE A ===
  yPos += 18;
  doc.setFontSize(14);
  doc.setFont('times', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('DESTINEE A', pw / 2, yPos, { align: 'center' });

  // === NOM PRENOM ===
  yPos += 12;
  doc.setFontSize(18);
  doc.setFont('times', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(`${data.nom.toUpperCase()} ${data.prenom.toUpperCase()}`, pw / 2, yPos, { align: 'center' });

  // === ENCADRE LEGAL ===
  yPos += 14;
  const boxX = margin + 25;
  const boxW = pw - margin * 2 - 50;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.rect(boxX, yPos, boxW, 24);

  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.setTextColor(60, 60, 60);
  const legalText = "Selon l'arrete du 11 aout 2017 relatif a la formation continue des conducteurs de taxi et des conducteurs de voiture de transport avec chauffeur et a la mobilite des conducteurs de taxi.";
  const splitLines = doc.splitTextToSize(legalText, boxW - 10);
  doc.text(splitLines, pw / 2, yPos + 8, { align: 'center' });

  // === SECTION BASSE ===
  const [y, m, d] = data.dateFin.split('-').map(Number);
  const jourMois = `${d} ${MOIS_FR[m - 1]}`.toUpperCase();
  const annee = String(y);

  // Sceau / Badge date
  const sealX = margin + 55;
  const sealY = ph - margin - 60;
  const sealR = 18;

  // Cercle externe (doré)
  doc.setDrawColor(180, 150, 80);
  doc.setLineWidth(2);
  doc.circle(sealX, sealY, sealR, 'S');
  // Cercle interne
  doc.setLineWidth(0.5);
  doc.circle(sealX, sealY, sealR - 3, 'S');

  // Texte dans le sceau
  doc.setFontSize(11);
  doc.setFont('times', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text(jourMois, sealX, sealY - 3, { align: 'center' });
  doc.setFontSize(20);
  doc.setTextColor(180, 50, 50);
  doc.text(annee, sealX, sealY + 8, { align: 'center' });

  // Centre de formation agrée
  const infoX = pw / 2 + 10;
  doc.setFontSize(12);
  doc.setFont('times', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Centre de formation agree : N VTC 69-16-05', infoX, sealY - 14, { align: 'center' });

  // Ligne de séparation
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(1);
  doc.line(infoX - 50, sealY - 6, infoX + 50, sealY - 6);

  // SERVICES PRO / FTRANSPORT / Adresse
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('SERVICES PRO', infoX, sealY + 4, { align: 'center' });
  doc.text('FTRANSPORT', infoX, sealY + 10, { align: 'center' });
  doc.text('86 route de Genas 69003 Lyon', infoX, sealY + 16, { align: 'center' });

  // Logo en bas à droite
  try {
    doc.addImage(logoImage, 'PNG', pw - margin - 60, sealY - 18, 45, 16);
  } catch (e) {
    console.log('Logo non charge');
  }

  // Tampon en bas à droite
  try {
    doc.addImage(tamponImage, 'PNG', pw - margin - 40, sealY + 6, 25, 25);
  } catch (e) {
    console.log('Tampon non charge');
  }

  // === TELECHARGER ===
  doc.save(`Attestation_FC_VTC_${data.nom.toUpperCase()}_${data.prenom}.pdf`);
}
