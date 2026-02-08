import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import logoImage from '@/assets/logo-ftransport.png';

const COMPANY_INFO = {
  name: 'Ftransport',
  address: '86 Route de Genas 69003 Lyon',
  siret: '53516371400044',
  naf: '8559A',
  declaration: '11770762377',
  phone: '09.86.22.30.62',
};

const ONBOARDING_URL = 'https://insight-learn-manage.lovable.app/onboarding';

export async function generateBienvenueFtransport(apprenant: {
  nom: string;
  prenom: string;
  type_apprenant?: string | null;
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Fond subtil en haut
  doc.setFillColor(0, 51, 102);
  doc.rect(0, 0, pageWidth, 60, 'F');
  
  // Logo Ftransport centré
  try {
    doc.addImage(logoImage, 'PNG', pageWidth / 2 - 40, 10, 80, 30);
  } catch (e) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('FTRANSPORT', pageWidth / 2, 30, { align: 'center' });
  }
  
  // Titre de bienvenue
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Bienvenue chez FTRANSPORT !', pageWidth / 2, 52, { align: 'center' });
  
  // Corps du document
  let y = 80;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  // Nom de l'apprenant
  doc.setFont('helvetica', 'bold');
  doc.text(`Bonjour ${apprenant.prenom} ${apprenant.nom},`, 20, y);
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  // Type de formation
  const formationType = getFormationType(apprenant.type_apprenant);
  
  // Message de bienvenue
  const welcomeText = `Nous avons le plaisir de vous confirmer votre inscription pour la formation ${formationType}.`;
  const splitWelcome = doc.splitTextToSize(welcomeText, pageWidth - 40);
  doc.text(splitWelcome, 20, y);
  y += splitWelcome.length * 7 + 10;
  
  // Section étapes
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(15, y, pageWidth - 30, 70, 5, 5, 'F');
  y += 12;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 51, 102);
  doc.text('📋 Complétez votre inscription', 25, y);
  y += 12;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const steps = [
    '1. Inscrivez-vous sur le site de la CMA (Chambre des Métiers)',
    '2. Téléchargez vos documents obligatoires',
    '3. Confirmez vos informations d\'examen',
    '4. Envoyez votre dossier complet'
  ];
  
  steps.forEach(step => {
    doc.text(step, 30, y);
    y += 10;
  });
  
  y += 20;
  
  // Lien vers l'onboarding
  doc.setFillColor(0, 102, 204);
  doc.roundedRect(pageWidth / 2 - 70, y, 140, 30, 5, 5, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Suivre les étapes d\'inscription', pageWidth / 2, y + 12, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('▶ Cliquez sur le lien ci-dessous', pageWidth / 2, y + 22, { align: 'center' });
  
  y += 40;
  
  // URL cliquable
  doc.setTextColor(0, 102, 204);
  doc.setFontSize(10);
  doc.textWithLink(ONBOARDING_URL, pageWidth / 2, y, {
    url: ONBOARDING_URL,
    align: 'center'
  });
  
  // Ligne sous le lien
  const linkWidth = doc.getTextWidth(ONBOARDING_URL);
  doc.setDrawColor(0, 102, 204);
  doc.line(pageWidth / 2 - linkWidth / 2, y + 1, pageWidth / 2 + linkWidth / 2, y + 1);
  
  y += 25;
  
  // Informations de contact
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Pour toute question, contactez-nous :', 20, y);
  y += 8;
  doc.text(`📞 ${COMPANY_INFO.phone}`, 25, y);
  y += 8;
  doc.text(`📍 ${COMPANY_INFO.address}`, 25, y);
  
  // Date de génération
  y += 20;
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  doc.text(`Document généré le ${today}`, 20, y);
  
  // Pied de page
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`${COMPANY_INFO.name} - ${COMPANY_INFO.address}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`SIRET: ${COMPANY_INFO.siret} - NAF: ${COMPANY_INFO.naf} - N° Déclaration: ${COMPANY_INFO.declaration}`, pageWidth / 2, footerY + 5, { align: 'center' });
  
  // Télécharger le PDF
  doc.save(`bienvenue_ftransport_${apprenant.nom}_${apprenant.prenom}.pdf`);
  
  return doc;
}

function getFormationType(typeApprenant: string | null | undefined): string {
  const type = (typeApprenant || '').toLowerCase();
  
  if (type.includes('ta')) {
    return 'TAXI (mobilité VTC → TAXI)';
  }
  if (type.includes('va')) {
    return 'VTC (mobilité TAXI → VTC)';
  }
  if (type.includes('taxi')) {
    return 'TAXI';
  }
  if (type.includes('vtc')) {
    return 'VTC';
  }
  
  return 'TAXI / VTC';
}
