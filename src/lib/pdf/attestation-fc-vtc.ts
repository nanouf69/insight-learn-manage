import jsPDF from 'jspdf';
import logoImage from '@/assets/logo-ftransport-2.png';
import tamponImage from '@/assets/tampon-entreprise.png';
import signatureImage from '@/assets/signature-dirigeant.png';

const COMPANY_INFO = {
  name: 'FTRANSPORT',
  representant: 'GUENICHI NAOUFAL',
  address: '86 Route de Genas 69003 Lyon',
  telephone: '04 78 54 34 86',
  email: 'contact@ftransport.fr',
  siren: '535 163 714',
  agrement: 'VTC-69-16-005',
};

interface AttestationFCData {
  nom: string;
  prenom: string;
  dateFin: string; // YYYY-MM-DD
  dateDebut?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  telephone?: string;
  email?: string;
  dateNaissance?: string;
  formation?: 'VTC' | 'TAXI';
}

function formatDateFR(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function generateCertificateNumber(dateFin: string, nom: string, formation: 'VTC' | 'TAXI' = 'VTC'): string {
  const year = dateFin.split('-')[0] || '2025';
  const initials = nom.substring(0, 3).toUpperCase();
  const num = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  const prefix = formation === 'TAXI' ? 'FCOTAXI' : 'FCOVTC';
  return `${prefix}-${year}-LYON-${num}-${initials}`;
}

export async function generateAttestationFCVTC(data: AttestationFCData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();  // ~210
  const ph = doc.internal.pageSize.getHeight(); // ~297
  const marginL = 15;
  const marginR = pw - 15;
  const contentW = marginR - marginL;

  // === LOGO ===
  try {
    doc.addImage(logoImage, 'PNG', pw / 2 - 30, 8, 60, 22);
  } catch (e) {
    console.log('Logo non chargé');
  }

  // === TITRE ===
  const formation = data.formation || 'VTC';
  const agrement = formation === 'TAXI' ? 'TAXI-69-16-005' : COMPANY_INFO.agrement;
  let y = 36;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('ATTESTATION DE FORMATION CONTINUE', pw / 2, y, { align: 'center' });
  y += 7;
  doc.text(`OBLIGATOIRE ${formation}`, pw / 2, y, { align: 'center' });

  // === ORGANISME D'ACCUEIL ===
  y += 10;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text("L'organisme d'accueil :", marginL, y);
  y += 2;
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.line(marginL, y, marginL + 52, y);

  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Nom : ', marginL, y);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.name, marginL + 15, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Représentant légal : ', pw / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.representant, pw / 2 + 35, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Adresse : ', marginL, y);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.address, marginL + 18, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Téléphone : ', marginL, y);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.telephone, marginL + 22, y);

  doc.setFont('helvetica', 'bold');
  doc.text('E-mail : ', pw / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.email, pw / 2 + 16, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('N° Siren : ', marginL, y);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.siren, marginL + 20, y);

  doc.setFont('helvetica', 'bold');
  doc.text('N° Agrément : ', pw / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(agrement, pw / 2 + 26, y);

  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Certifie que :', marginL, y);

  // === L'APPRENANT ===
  y += 8;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text("L'apprenant :", marginL, y);
  y += 2;
  doc.line(marginL, y, marginL + 32, y);

  y += 4;
  // Tableau apprenant
  const tableX = marginL;
  const col1W = 30;
  const col2W = 45;
  const col3W = 30;
  const col4W = contentW - col1W - col2W - col3W;
  const rowH = 8;
  doc.setFontSize(8);

  const drawRow = (label1: string, val1: string, label2: string, val2: string) => {
    // Bordures
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(tableX, y, col1W, rowH);
    doc.rect(tableX + col1W, y, col2W, rowH);
    doc.rect(tableX + col1W + col2W, y, col3W, rowH);
    doc.rect(tableX + col1W + col2W + col3W, y, col4W, rowH);

    // Fond gris clair pour labels
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, y, col1W, rowH, 'F');
    doc.rect(tableX + col1W + col2W, y, col3W, rowH, 'F');
    // Rebordures
    doc.rect(tableX, y, col1W, rowH);
    doc.rect(tableX + col1W, y, col2W, rowH);
    doc.rect(tableX + col1W + col2W, y, col3W, rowH);
    doc.rect(tableX + col1W + col2W + col3W, y, col4W, rowH);

    doc.setFont('helvetica', 'bold');
    doc.text(label1, tableX + 2, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(val1, tableX + col1W + 2, y + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(label2, tableX + col1W + col2W + 2, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(val2, tableX + col1W + col2W + col3W + 2, y + 5.5);
    y += rowH;
  };

  drawRow('NOM :', data.nom.toUpperCase(), 'ADRESSE :', (data.adresse || '-').toUpperCase());
  drawRow('PRÉNOM :', data.prenom.toUpperCase(), 'CODE POSTAL :', data.codePostal || '-');
  drawRow('TÉLÉPHONE :', data.telephone || '-', 'VILLE :', (data.ville || '-').toUpperCase());
  drawRow('MAIL :', data.email || '-', '', '');

  // === A effectué une formation ===
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('A effectué une formation :', marginL, y);

  y += 4;
  const fCol1W = 55;
  const fCol2W = contentW - fCol1W;
  doc.setFontSize(9);

  const drawFormRow = (label: string, val: string) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, y, fCol1W, rowH, 'F');
    doc.rect(tableX, y, fCol1W, rowH);
    doc.rect(tableX + fCol1W, y, fCol2W, rowH);
    doc.setFont('helvetica', 'bold');
    doc.text(label, tableX + 2, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(val, tableX + fCol1W + 2, y + 5.5);
    y += rowH;
  };

  const dateDebutFR = data.dateDebut ? formatDateFR(data.dateDebut) : formatDateFR(data.dateFin);
  const dateFinFR = formatDateFR(data.dateFin);
  drawFormRow('DATE DE LA FORMATION', `Du ${dateDebutFR} AU ${dateFinFR}`);
  drawFormRow('HORAIRES', 'DE 09H00-12H00 / 13H00-17H00');

  // Date d'expiration = dateFin + 5 ans
  const finParts = data.dateFin.split('-').map(Number);
  const expYear = finParts[0] + 5;
  const dateExpFR = `${String(finParts[2]).padStart(2, '0')}/${String(finParts[1]).padStart(2, '0')}/${expYear}`;
  drawFormRow('DATE EXPIRATION', dateExpFR);

  // === SIGNATURES ===
  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Signature', marginR - 25, y, { align: 'center' });
  doc.text(COMPANY_INFO.name, marginR - 25, y + 4, { align: 'center' });

  y += 5;

  // Signature dirigeant + Tampon à droite
  try {
    doc.addImage(signatureImage, 'PNG', marginR - 50, y, 40, 20);
  } catch (e) {
    console.log('Signature non chargée');
  }

  try {
    doc.addImage(tamponImage, 'PNG', marginR - 50, y + 18, 45, 22);
  } catch (e) {
    console.log('Tampon non chargé');
  }

  // === PIED DE PAGE ===
  const footerY = ph - 12;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`(*) Cette attestation peut être vérifiée en contactant ${COMPANY_INFO.email}`, pw / 2, footerY, { align: 'center' });

  // === TELECHARGER ===
  doc.save(`Attestation_FC_${formation}_${data.nom.toUpperCase()}_${data.prenom}.pdf`);
}
