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
  const margin = 8;

  // === BORDURE DOUBLE ===
  // Cadre extérieur marron foncé
  doc.setDrawColor(80, 60, 40);
  doc.setLineWidth(1.2);
  doc.rect(margin, margin, pw - margin * 2, ph - margin * 2);
  // Cadre intérieur
  doc.setLineWidth(0.4);
  doc.rect(margin + 4, margin + 4, pw - margin * 2 - 8, ph - margin * 2 - 8);

  // === ORNEMENTS COINS (simulés avec petits arcs) ===
  const drawCornerOrnament = (cx: number, cy: number, flipX: number, flipY: number) => {
    doc.setDrawColor(180, 150, 80); // doré
    doc.setLineWidth(0.6);
    // Spirales simplifiées
    for (let i = 0; i < 3; i++) {
      const r = 4 + i * 3;
      const startX = cx + flipX * 2;
      const startY = cy + flipY * 2;
      doc.circle(startX, startY, r, 'S');
    }
  };
  
  // Ornements décoratifs simplifiés aux coins
  doc.setDrawColor(180, 150, 80);
  doc.setLineWidth(0.5);
  // Haut gauche
  doc.line(margin + 6, margin + 14, margin + 6, margin + 6);
  doc.line(margin + 6, margin + 6, margin + 14, margin + 6);
  // Haut droit
  doc.line(pw - margin - 6, margin + 14, pw - margin - 6, margin + 6);
  doc.line(pw - margin - 6, margin + 6, pw - margin - 14, margin + 6);
  // Bas gauche
  doc.line(margin + 6, ph - margin - 14, margin + 6, ph - margin - 6);
  doc.line(margin + 6, ph - margin - 6, margin + 14, ph - margin - 6);
  // Bas droit
  doc.line(pw - margin - 6, ph - margin - 14, pw - margin - 6, ph - margin - 6);
  doc.line(pw - margin - 6, ph - margin - 6, pw - margin - 14, ph - margin - 6);

  // === TITRE ===
  let yPos = margin + 38;
  doc.setTextColor(60, 45, 30); // marron foncé
  doc.setFontSize(36);
  doc.setFont('times', 'bold');
  doc.text('ATTESTATION DE SUIVI DE FORMATION', pw / 2, yPos, { align: 'center' });
  yPos += 18;
  doc.text('CONTINUE', pw / 2, yPos, { align: 'center' });

  // === DESTINEE A ===
  yPos += 22;
  doc.setFontSize(13);
  doc.setFont('times', 'italic');
  doc.setTextColor(120, 100, 80);
  doc.text('DESTINEE A', pw / 2, yPos, { align: 'center' });

  // === NOM PRENOM ===
  yPos += 12;
  doc.setFontSize(20);
  doc.setFont('times', 'bold');
  doc.setTextColor(50, 40, 30);
  doc.text(`${data.nom.toUpperCase()} ${data.prenom.toUpperCase()}`, pw / 2, yPos, { align: 'center' });

  // === ENCADRE LEGAL ===
  yPos += 16;
  const boxX = margin + 30;
  const boxW = pw - margin * 2 - 60;
  doc.setDrawColor(120, 100, 80);
  doc.setLineWidth(0.4);
  doc.rect(boxX, yPos, boxW, 22);

  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.setTextColor(60, 50, 40);
  const legalText = "Selon l'arrete du 11 aout 2017 relatif a la formation continue des conducteurs de taxi et des conducteurs de voiture de transport avec chauffeur et a la mobilite des conducteurs de taxi.";
  const splitLines = doc.splitTextToSize(legalText, boxW - 10);
  doc.text(splitLines, pw / 2, yPos + 8, { align: 'center' });

  // === SECTION BASSE ===
  const [y, m, d] = data.dateFin.split('-').map(Number);
  const jourMois = `${d} ${MOIS_FR[m - 1]}`.toUpperCase();
  const annee = String(y);

  // === Centre de formation agréé ===
  const infoX = pw / 2 + 15;
  const infoY = yPos + 32;
  doc.setFontSize(13);
  doc.setFont('times', 'bold');
  doc.setTextColor(50, 40, 30);
  doc.text('Centre de formation agree : N VTC 69-16-05', infoX, infoY, { align: 'center' });

  // === DOUBLE LIGNE grise ===
  const lineY = infoY + 10;
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(1.2);
  doc.line(infoX - 55, lineY, infoX + 55, lineY);
  doc.setLineWidth(0.4);
  doc.line(infoX - 55, lineY + 3, infoX + 55, lineY + 3);

  // === SCEAU / BADGE DATE ===
  const sealX = margin + 55;
  const sealY = infoY + 10;
  const sealR = 20;

  // Fond circulaire doré (simule le scalloped seal)
  // Cercle externe doré épais
  doc.setDrawColor(200, 170, 90);
  doc.setFillColor(245, 235, 210);
  doc.setLineWidth(4);
  doc.circle(sealX, sealY, sealR, 'FD');
  
  // Cercle interne blanc
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(180, 150, 80);
  doc.setLineWidth(1);
  doc.circle(sealX, sealY, sealR - 5, 'FD');

  // Texte dans le sceau
  doc.setFontSize(12);
  doc.setFont('times', 'bold');
  doc.setTextColor(80, 60, 30);
  doc.text(jourMois, sealX, sealY - 2, { align: 'center' });
  doc.setFontSize(24);
  doc.setTextColor(180, 120, 40); // doré/ambré
  doc.text(annee, sealX, sealY + 10, { align: 'center' });

  // === SERVICES PRO / FTRANSPORT / Adresse ===
  const servY = lineY + 10;
  doc.setFontSize(10);
  doc.setFont('times', 'bold');
  doc.setTextColor(60, 50, 40);
  doc.text('SERVICES PRO', infoX, servY, { align: 'center' });
  doc.text('FTRANSPORT', infoX, servY + 6, { align: 'center' });
  doc.setFont('times', 'normal');
  doc.text('86 route de Genas 69003 Lyon', infoX, servY + 12, { align: 'center' });

  // Logo FTRANSPORT à droite
  try {
    doc.addImage(logoImage, 'PNG', pw - margin - 65, infoY - 2, 50, 18);
  } catch (e) {
    console.log('Logo non charge');
  }

  // Tampon en bas à droite
  try {
    doc.addImage(tamponImage, 'PNG', pw - margin - 45, servY + 2, 28, 28);
  } catch (e) {
    console.log('Tampon non charge');
  }

  // === TELECHARGER ===
  doc.save(`Attestation_FC_VTC_${data.nom.toUpperCase()}_${data.prenom}.pdf`);
}
