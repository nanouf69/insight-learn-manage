import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImage from '@/assets/logo-ftransport-2.png';

const COMPANY = {
  name: 'FTRANSPORT',
  address: '86 route de genas',
  cp: '69003',
  ville: 'Lyon',
  telephone: '04 28 29 60 91',
  email: 'contact@ftransport.fr',
  siret: '823 461 561 00016',
  iban: 'FR76 2823 3000 0185 7527 9099 426',
  bic: 'REVOFRP2',
  banque: 'Revolut Bank UAB',
};

function fmtDateFR(s?: string): string {
  if (!s) return '-';
  try {
    const d = new Date(s);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return s;
  }
}

function eur(n: number): string {
  return `${(n || 0).toFixed(2).replace('.', ',')} €`;
}

export async function generateDraftPDF(draft: any) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 15;
  const mr = pw - 15;

  // Logo
  try {
    doc.addImage(logoImage, 'PNG', ml, 10, 45, 16);
  } catch {}

  // Banner brouillon
  doc.setFillColor(253, 230, 138);
  doc.rect(ml, 28, mr - ml, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(146, 64, 14);
  doc.text('⚠ BROUILLON — Facture non validée', pw / 2, 34, { align: 'center' });
  doc.setTextColor(30, 30, 30);

  // Titre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`FACTURE ${draft?.duplicata ? 'DUPLICATA ' : ''}N°${draft?.numero || ''}`, mr, 45, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Numéro interne : ${draft?.numeroInterne || ''}`, mr, 50, { align: 'right' });
  doc.text(`Date de facturation : ${fmtDateFR(draft?.date)}`, mr, 55, { align: 'right' });
  doc.text(`Date d'échéance : ${fmtDateFR(draft?.dateEcheance)}`, mr, 60, { align: 'right' });

  // Émetteur
  let y = 70;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Émetteur :', ml, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(COMPANY.name, ml, y); y += 4;
  doc.text(COMPANY.address, ml, y); y += 4;
  doc.text(`${COMPANY.cp} ${COMPANY.ville}`, ml, y); y += 4;
  doc.text(`SIRET : ${COMPANY.siret}`, ml, y); y += 4;
  doc.text(`Tél : ${COMPANY.telephone}`, ml, y); y += 4;
  doc.text(`Email : ${COMPANY.email}`, ml, y);

  // Destinataire
  const destX = pw / 2 + 5;
  let yd = 70;
  doc.setFont('helvetica', 'bold');
  doc.text('Adressée à :', destX, yd);
  doc.setFont('helvetica', 'normal');
  yd += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(draft?.refDossier || '(client non défini)', destX, yd);
  doc.setFont('helvetica', 'normal');
  yd += 4;
  if (draft?.refConvention) {
    doc.text(`Réf à rappeler : ${draft.refConvention}`, destX, yd);
    yd += 4;
  }

  // Lignes
  const lignes: any[] = Array.isArray(draft?.lignes) ? draft.lignes : [];
  const calcLigneHT = (l: any) =>
    (Number(l.prixUnitaire) || 0) * (Number(l.quantite) || 1) * (1 - (Number(l.remise) || 0) / 100);

  const tableData = lignes.map((l: any) => [
    l.stagiaire || '',
    `${l.designation || ''}${l.dateDebut ? `\nDu ${fmtDateFR(l.dateDebut)} au ${fmtDateFR(l.dateFin)}` : ''}${l.lieu ? `\nLieu : ${l.lieu}` : ''}`,
    l.tvaType || '',
    eur(Number(l.prixUnitaire) || 0),
    String(Number(l.quantite) || 1),
    l.remise ? `${l.remise}%` : '',
    eur(calcLigneHT(l)),
  ]);

  autoTable(doc, {
    startY: Math.max(y, yd) + 6,
    head: [['Stagiaire', 'Désignation', 'TVA', 'P.U. HT', 'Qté', 'Rem', 'Total HT']],
    body: tableData.length ? tableData : [['', 'Aucune prestation', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [243, 244, 246], textColor: [30, 30, 30], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: ml, right: ml },
  });

  // Totaux
  const finalY = (doc as any).lastAutoTable?.finalY || Math.max(y, yd) + 40;
  const totalHT = lignes.reduce((s, l) => s + calcLigneHT(l), 0);
  const totalTVA = lignes.reduce((s, l) => {
    const taux = l.tvaType === 'EXO' ? 0 : Number(l.tvaTaux) || 20;
    return s + calcLigneHT(l) * (taux / 100);
  }, 0);
  const totalTTC = totalHT + totalTVA;

  let yT = finalY + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total HT : ${eur(totalHT)}`, mr, yT, { align: 'right' }); yT += 5;
  doc.text(`Total TVA : ${eur(totalTVA)}`, mr, yT, { align: 'right' }); yT += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total TTC : ${eur(totalTTC)}`, mr, yT, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Banque
  yT += 10;
  doc.setFillColor(249, 250, 251);
  doc.rect(ml, yT, mr - ml, 18, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(ml, yT, mr - ml, 18, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Règlement par virement :', ml + 3, yT + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Banque : ${COMPANY.banque} | IBAN : ${COMPANY.iban} | BIC : ${COMPANY.bic}`, ml + 3, yT + 12);

  // Conditions
  yT += 24;
  doc.setFillColor(254, 252, 232);
  doc.rect(ml, yT, mr - ml, 28, 'F');
  doc.setDrawColor(253, 230, 138);
  doc.rect(ml, yT, mr - ml, 28, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(146, 64, 14);
  doc.text('Conditions de règlement', ml + 3, yT + 5);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const condText = `Paiement par virement bancaire ou en espèces à réception de facture. Date d'échéance : ${fmtDateFR(draft?.dateEcheance)}. Aucun escompte accordé pour paiement anticipé. En cas de retard de paiement, des pénalités de retard au taux de 3 fois le taux d'intérêt légal en vigueur seront appliquées, ainsi qu'une indemnité forfaitaire de recouvrement de 40,00 €, conformément aux articles L441-10 et D441-5 du Code de commerce.`;
  const condLines = doc.splitTextToSize(condText, mr - ml - 6);
  doc.text(condLines, ml + 3, yT + 11);

  // Footer
  const footerY = ph - 10;
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `${COMPANY.name} - ${COMPANY.address} ${COMPANY.cp} ${COMPANY.ville} - SIRET : ${COMPANY.siret} - TVA non applicable - article 293 B du CGI`,
    pw / 2, footerY, { align: 'center' }
  );

  const fileName = `Brouillon_Facture_${draft?.numeroInterne || draft?.numero || 'draft'}.pdf`;
  doc.save(fileName);
  return { fileName };
}
