import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import signatureImage from '@/assets/signature-dirigeant.png';
import tamponImage from '@/assets/tampon-entreprise.png';
import logoImage from '@/assets/logo-ftransport.png';

const COMPANY_INFO = {
  name: 'Ftransport',
  address: '86 Route de Genas 69003 Lyon',
  siret: '53516371400044',
};

// Calcul du nombre d'heures selon le type de formation
function getFormationHours(formationType: string | null): number {
  if (!formationType) return 0;
  const lower = formationType.toLowerCase();
  if (lower.includes('vtc') && !lower.includes('e-learning')) return 70;
  if (lower.includes('taxi') && !lower.includes('e-learning')) return 140;
  if (lower.includes('ta') || lower.includes('passerelle')) return 35;
  if (lower.includes('e-learning')) return 35;
  return 70; // Par défaut
}

export async function generateAttestationFranceTravail(apprenant: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Logo en haut à droite
  try {
    doc.addImage(logoImage, 'PNG', pageWidth - 60, 5, 45, 16);
  } catch (e) {
    console.log('Logo non chargé');
  }
  
  // Ligne de titre
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const titleLine = '----------------------- Formulaire à compléter et à retourner à votre France Travail -----------------------';
  doc.text(titleLine, pageWidth / 2, 25, { align: 'center' });
  
  // Référence et nom
  let y = 40;
  doc.setFontSize(10);
  doc.text(`Référence : ${apprenant.numero_dossier_cma || '..........'}`, 20, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Nom Prénom : ${apprenant.nom?.toUpperCase() || ''} ${apprenant.prenom?.toUpperCase() || ''}`, pageWidth - 80, y);
  doc.setFont('helvetica', 'normal');
  
  y += 20;
  
  // Dates de stage
  const dateDebut = apprenant.date_debut_formation || '..... / ..... / .....';
  const dateFin = apprenant.date_fin_formation || '..... / ..... / .....';
  
  doc.text(`Date de début de stage :  ${dateDebut}`, 20, y);
  y += 12;
  doc.text(`Date de fin de stage    :  ${dateFin}`, 20, y);
  y += 12;
  
  // Nombre d'heures
  const heures = getFormationHours(apprenant.type_apprenant);
  doc.text(`Nombre d'heures          :  ${heures} heures`, 20, y);
  y += 12;
  
  // Type de rémunération - à remplir manuellement
  doc.text('Type de rémunération  :  .......................................', 20, y);
  y += 12;
  
  // Organisme payeur - à remplir manuellement
  doc.text('Organisme payeur       :  .......................................', 20, y);
  y += 20;
  
  // Questions avec cases à cocher
  doc.setFontSize(10);
  doc.text('Ce stage a t-il débuté alors que vous étiez en contrat de sécurisation professionnelle ?', 20, y);
  y += 10;
  
  // Cases Oui / Non
  doc.rect(30, y - 4, 5, 5);
  doc.text('Oui', 37, y);
  doc.rect(60, y - 4, 5, 5);
  doc.text('Non', 67, y);
  y += 15;
  
  doc.text("S'agit-il de cours du soir ?", 20, y);
  y += 10;
  
  doc.rect(30, y - 4, 5, 5);
  doc.text('Oui', 37, y);
  doc.rect(60, y - 4, 5, 5);
  doc.text('Non', 67, y);
  y += 15;
  
  // Date
  doc.text('Le ..... / ..... / .....', 20, y);
  y += 25;
  
  // Signature et cachet
  doc.text('Signature', 20, y);
  doc.text("Cachet de l'organisme de formation", pageWidth - 80, y);
  
  y += 10;
  
  // Ajouter signature
  try {
    doc.addImage(signatureImage, 'PNG', 15, y, 45, 22);
  } catch (e) {
    console.log('Signature non chargée');
  }
  
  // Ajouter tampon
  try {
    doc.addImage(tamponImage, 'PNG', pageWidth - 90, y, 55, 28);
  } catch (e) {
    console.log('Tampon non chargé');
  }
  
  y += 40;
  
  // Pied de page France Travail
  const footerY = doc.internal.pageSize.getHeight() - 45;
  
  doc.setFillColor(0, 51, 153);
  doc.rect(0, footerY, pageWidth, 2, 'F');
  doc.setFillColor(255, 204, 0);
  doc.rect(0, footerY + 2, pageWidth, 1, 'F');
  doc.setFillColor(0, 153, 51);
  doc.rect(0, footerY + 3, pageWidth, 1, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 153);
  doc.text('FRANCE TRAVAIL AUVERGNE-RHONE-ALPES', pageWidth / 2, footerY + 10, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('Adresse de correspondance', pageWidth / 2, footerY + 15, { align: 'center' });
  doc.text('CS 73367 - 69371 LYON CEDEX 08', pageWidth / 2, footerY + 19, { align: 'center' });
  
  doc.setFontSize(6);
  doc.text('FT LYON ALBERT THOMAS  68 CRS ALBERT THOMAS   69373 LYON CEDEX 08', pageWidth / 2, footerY + 25, { align: 'center' });
  
  doc.setTextColor(0, 51, 153);
  doc.text('www.francetravail.fr', pageWidth / 2 - 20, footerY + 30, { align: 'center' });
  
  // Numéro vert
  doc.setFillColor(0, 153, 51);
  doc.roundedRect(pageWidth / 2, footerY + 27, 25, 5, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.text('3949', pageWidth / 2 + 5, footerY + 30);
  
  doc.setTextColor(255, 204, 0);
  doc.text('Service gratuit + prix appel', pageWidth / 2 + 15, footerY + 30);
  
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(5);
  doc.text('ACCES LIBRE DE 8H30 A 12H30 DU LUNDI AU VENDREDI RECEPTION SUR RENDEZ VOUS TOUS LES APRES MIDI SAUF LE JEUDI', pageWidth / 2, footerY + 36, { align: 'center' });
  
  doc.save(`attestation_france_travail_${apprenant.nom}_${apprenant.prenom}.pdf`);
}
