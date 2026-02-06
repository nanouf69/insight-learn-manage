import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Import des assets
import signatureImage from '@/assets/signature-dirigeant.png';
import tamponImage from '@/assets/tampon-entreprise.png';

const COMPANY_INFO = {
  name: 'F.Transport Services Pro',
  address: '86 Route de Genas 69003 Lyon',
  siret: '53516371400044',
  naf: '8559A',
  declaration: '11770762377',
  phone: '09.86.22.30.62',
  fax: '08.90.20.85.19',
};

export async function generateAttestationInscription(apprenant: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // En-tête
  doc.setFillColor(0, 51, 102);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text("ATTESTATION D'INSCRIPTION", pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.name, pageWidth / 2, 30, { align: 'center' });
  
  // Corps
  doc.setTextColor(0, 0, 0);
  let y = 50;
  
  doc.setFontSize(11);
  doc.text('Je soussigné, Directeur de ' + COMPANY_INFO.name + ',', 20, y);
  y += 10;
  
  doc.text('certifie que :', 20, y);
  y += 15;
  
  // Informations apprenant
  doc.setFont('helvetica', 'bold');
  const fullName = `${apprenant.civilite || ''} ${apprenant.prenom} ${apprenant.nom}`.trim();
  doc.text(fullName, 20, y);
  y += 8;
  
  doc.setFont('helvetica', 'normal');
  if (apprenant.date_naissance) {
    const dateNaissance = format(new Date(apprenant.date_naissance), 'dd MMMM yyyy', { locale: fr });
    doc.text(`Né(e) le : ${dateNaissance}`, 20, y);
    y += 8;
  }
  
  if (apprenant.adresse) {
    doc.text(`Demeurant : ${apprenant.adresse}`, 20, y);
    y += 6;
    doc.text(`${apprenant.code_postal || ''} ${apprenant.ville || ''}`, 20, y);
    y += 12;
  } else {
    y += 8;
  }
  
  doc.text('est inscrit(e) à la formation suivante :', 20, y);
  y += 12;
  
  // Formation
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(15, y - 5, pageWidth - 30, 35, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Formation : ${apprenant.formation_choisie || '-'}`, 20, y + 5);
  y += 12;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Période : du ${apprenant.date_debut_formation || '-'} au ${apprenant.date_fin_formation || '-'}`, 20, y + 5);
  y += 8;
  doc.text(`Lieu : ${COMPANY_INFO.address}`, 20, y + 5);
  y += 25;
  
  // Date et signature
  y += 15;
  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  doc.text(`Fait à Lyon, le ${today}`, 20, y);
  y += 20;
  
  doc.text('Le Directeur,', pageWidth - 60, y);
  y += 5;
  
  // Ajouter signature
  try {
    doc.addImage(signatureImage, 'PNG', pageWidth - 80, y, 50, 25);
    y += 30;
  } catch (e) {
    console.log('Signature non chargée');
    y += 30;
  }
  
  // Ajouter tampon
  try {
    doc.addImage(tamponImage, 'PNG', pageWidth - 90, y, 60, 30);
  } catch (e) {
    console.log('Tampon non chargé');
  }
  
  // Pied de page
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`${COMPANY_INFO.name} - ${COMPANY_INFO.address}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`SIRET: ${COMPANY_INFO.siret} - NAF: ${COMPANY_INFO.naf} - N° Déclaration: ${COMPANY_INFO.declaration}`, pageWidth / 2, footerY + 5, { align: 'center' });
  
  // Télécharger
  doc.save(`attestation_inscription_${apprenant.nom}_${apprenant.prenom}.pdf`);
}
