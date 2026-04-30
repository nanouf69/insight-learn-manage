import jsPDF from 'jspdf';
import logoImage from '@/assets/logo-ftransport-2.png';

const COMPANY = {
  name: 'Services pro Ftransport',
  address: '86 Route de Genas',
  cp: '69003',
  ville: 'Lyon',
  telephone: '04 28 29 60 91',
  email: 'contact@ftransport.fr',
  siren: '823 461 561',
  agrement: '69-16-15',
  iban: 'FR76 ...',
  bic: 'REVOFRP2',
  banque: 'Revolut',
  capital: '5 000',
  declaration: '84 69 17 911 69',
};

export interface FactureFCFinanceur {
  type_financeur?: 'particulier' | 'professionnel' | string;
  raison_sociale?: string | null;
  siren?: string | null;
  siret?: string | null;
  numero_tva?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  contact_nom?: string | null;
  contact_email?: string | null;
  contact_telephone?: string | null;
  organisme_financeur?: string | null;
  numero_dossier?: string | null;
  email_facturation?: string | null;
}

export interface FactureFCData {
  numero: string;
  dateEmission: string; // YYYY-MM-DD
  dateEcheance?: string;
  apprenant: {
    nom: string;
    prenom: string;
    adresse?: string;
    code_postal?: string;
    ville?: string;
    email?: string;
    telephone?: string;
  };
  financeur: FactureFCFinanceur | null | undefined;
  formation: 'VTC' | 'TAXI';
  designation: string;
  montantHT: number;
  tvaTaux?: number; // default 0 (TVA non applicable art 293B)
  duree?: string;
  refDossier?: string;
  refConvention?: string;
  acquittee?: boolean;
  dateAcquittement?: string; // YYYY-MM-DD
  moyenPaiement?: string;
}

function fmtDateFR(d: string): string {
  if (!d) return '-';
  const p = d.split('-');
  if (p.length !== 3) return d;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function eur(n: number): string {
  return `${(n || 0).toFixed(2).replace('.', ',')} €`;
}

export async function generateFactureFC(
  data: FactureFCData,
  options?: { returnBlob?: boolean; existingDoc?: jsPDF; addPage?: boolean; returnDoc?: boolean }
) {
  const doc = options?.existingDoc ?? new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  if (options?.existingDoc && options?.addPage) doc.addPage();

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 15;
  const mr = pw - 15;

  // Logo
  try {
    doc.addImage(logoImage, 'PNG', ml, 10, 45, 16);
  } catch {}

  // Titre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text(`FACTURE N° ${data.numero}`, mr, 18, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date : ${fmtDateFR(data.dateEmission)}`, mr, 24, { align: 'right' });
  if (data.dateEcheance) {
    doc.text(`Échéance : ${fmtDateFR(data.dateEcheance)}`, mr, 29, { align: 'right' });
  }

  // Émetteur
  let y = 38;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Émetteur :', ml, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(COMPANY.name, ml, y); y += 4;
  doc.text(`${COMPANY.address}`, ml, y); y += 4;
  doc.text(`${COMPANY.cp} ${COMPANY.ville}`, ml, y); y += 4;
  doc.text(`SIREN : ${COMPANY.siren}`, ml, y); y += 4;
  doc.text(`Tél : ${COMPANY.telephone}`, ml, y); y += 4;
  doc.text(`Email : ${COMPANY.email}`, ml, y); y += 4;
  doc.text(`Déclaration n° ${COMPANY.declaration}`, ml, y);

  // Destinataire (financeur ou apprenant)
  const fin = data.financeur;
  const isPro = fin && fin.type_financeur === 'professionnel';
  const destX = pw / 2 + 5;
  let yd = 38;
  doc.setFont('helvetica', 'bold');
  doc.text('Adressée à :', destX, yd);
  doc.setFont('helvetica', 'normal');
  yd += 5;

  if (isPro && fin) {
    doc.setFont('helvetica', 'bold');
    doc.text(fin.raison_sociale || '-', destX, yd);
    doc.setFont('helvetica', 'normal');
    yd += 4;
    if (fin.adresse) { doc.text(fin.adresse, destX, yd); yd += 4; }
    if (fin.code_postal || fin.ville) {
      doc.text(`${fin.code_postal || ''} ${fin.ville || ''}`.trim(), destX, yd); yd += 4;
    }
    if (fin.siret) { doc.text(`SIRET : ${fin.siret}`, destX, yd); yd += 4; }
    else if (fin.siren) { doc.text(`SIREN : ${fin.siren}`, destX, yd); yd += 4; }
    if (fin.numero_tva) { doc.text(`TVA : ${fin.numero_tva}`, destX, yd); yd += 4; }
    if (fin.contact_nom) { doc.text(`Contact : ${fin.contact_nom}`, destX, yd); yd += 4; }
    if (fin.email_facturation || fin.contact_email) {
      doc.text(`Email : ${fin.email_facturation || fin.contact_email}`, destX, yd); yd += 4;
    }
    if (fin.organisme_financeur) {
      doc.setFont('helvetica', 'italic');
      doc.text(`Organisme : ${fin.organisme_financeur}`, destX, yd); yd += 4;
      doc.setFont('helvetica', 'normal');
    }
    if (fin.numero_dossier) {
      doc.text(`N° dossier : ${fin.numero_dossier}`, destX, yd); yd += 4;
    }
  } else {
    // Particulier : utilise infos apprenant ou financeur particulier
    const a = data.apprenant;
    doc.setFont('helvetica', 'bold');
    doc.text(`${a.prenom || ''} ${(a.nom || '').toUpperCase()}`.trim(), destX, yd);
    doc.setFont('helvetica', 'normal');
    yd += 4;
    const adr = a.adresse || fin?.adresse;
    const cp = a.code_postal || fin?.code_postal;
    const v = a.ville || fin?.ville;
    if (adr) { doc.text(adr, destX, yd); yd += 4; }
    if (cp || v) { doc.text(`${cp || ''} ${v || ''}`.trim(), destX, yd); yd += 4; }
    const em = a.email || fin?.contact_email || fin?.email_facturation;
    if (em) { doc.text(`Email : ${em}`, destX, yd); yd += 4; }
    const tel = a.telephone || fin?.contact_telephone;
    if (tel) { doc.text(`Tél : ${tel}`, destX, yd); yd += 4; }
  }

  // Stagiaire (toujours mentionné)
  let yMid = Math.max(y, yd) + 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Stagiaire :', ml, yMid);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.apprenant.prenom || ''} ${(data.apprenant.nom || '').toUpperCase()}`.trim(), ml + 25, yMid);
  yMid += 6;
  if (data.refDossier) {
    doc.text(`Réf dossier : ${data.refDossier}`, ml, yMid); yMid += 5;
  }
  if (data.refConvention) {
    doc.text(`Réf convention : ${data.refConvention}`, ml, yMid); yMid += 5;
  }

  // Tableau désignation
  const tableY = yMid + 6;
  doc.setFillColor(240, 240, 240);
  doc.rect(ml, tableY, mr - ml, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Désignation', ml + 2, tableY + 5.5);
  doc.text('Qté', ml + 110, tableY + 5.5);
  doc.text('P.U. HT', ml + 130, tableY + 5.5);
  doc.text('Total HT', mr - 2, tableY + 5.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  const ligneY = tableY + 14;
  const designation = data.designation || `Formation Continue Obligatoire ${data.formation}${data.duree ? ` (${data.duree})` : ''}`;
  // Wrap designation
  const lines = doc.splitTextToSize(designation, 100);
  doc.text(lines, ml + 2, ligneY);
  doc.text('1', ml + 110, ligneY);
  doc.text(eur(data.montantHT), ml + 130, ligneY);
  doc.text(eur(data.montantHT), mr - 2, ligneY, { align: 'right' });

  // Bordures tableau
  const tableEndY = ligneY + Math.max(6, lines.length * 4);
  doc.setDrawColor(200, 200, 200);
  doc.line(ml, tableY, mr, tableY);
  doc.line(ml, tableY + 8, mr, tableY + 8);
  doc.line(ml, tableEndY, mr, tableEndY);
  doc.line(ml, tableY, ml, tableEndY);
  doc.line(mr, tableY, mr, tableEndY);

  // Totaux
  const tva = data.tvaTaux ?? 0;
  const montantTVA = (data.montantHT * tva) / 100;
  const ttc = data.montantHT + montantTVA;
  let yT = tableEndY + 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Total HT : ${eur(data.montantHT)}`, mr, yT, { align: 'right' }); yT += 5;
  doc.text(`TVA (${tva}%) : ${eur(montantTVA)}`, mr, yT, { align: 'right' }); yT += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total TTC : ${eur(ttc)}`, mr, yT, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Mentions légales
  yT += 10;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const mentions = doc.splitTextToSize(
    `TVA non applicable - article 293 B du CGI. Action de formation au sens de l'article L.6313-1 du Code du travail. ` +
    `Paiement par virement bancaire à réception de facture. ` +
    `En cas de retard de paiement, pénalités au taux de 3 fois le taux d'intérêt légal et indemnité forfaitaire de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce).`,
    mr - ml
  );
  doc.text(mentions, ml, yT);

  // Pied de page
  const footerY = ph - 12;
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `${COMPANY.name} - ${COMPANY.address} ${COMPANY.cp} ${COMPANY.ville} - SIREN ${COMPANY.siren} - Déclaration ${COMPANY.declaration}`,
    pw / 2, footerY, { align: 'center' }
  );

  const fileName = `Facture_${data.numero}_${(data.apprenant.nom || '').toUpperCase()}_${data.apprenant.prenom || ''}.pdf`;
  if (options?.returnDoc) return { doc, fileName };
  if (options?.returnBlob) {
    const blob = doc.output('blob');
    return { blob, fileName, doc };
  }
  doc.save(fileName);
  return { fileName };
}
