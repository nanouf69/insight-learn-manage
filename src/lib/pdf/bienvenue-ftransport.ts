import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import logoImage from '@/assets/logo-ftransport.png';

const COMPANY_INFO = {
  name: 'Ftransport',
  address: '86 Route de Genas, 69003 Lyon',
  siret: '53516371400044',
  naf: '8559A',
  declaration: '11770762377',
  phone: '04 28 29 60 91',
  email: 'contact@ftransport.fr',
};

const ONBOARDING_URL = 'https://insight-learn-manage.lovable.app/bienvenue';

export async function generateBienvenueFtransport(apprenant: {
  nom: string;
  prenom: string;
  type_apprenant?: string | null;
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- En-tete bleu ---
  doc.setFillColor(0, 51, 102);
  doc.rect(0, 0, pageWidth, 55, 'F');

  try {
    doc.addImage(logoImage, 'PNG', pageWidth / 2 - 35, 8, 70, 26);
  } catch (e) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('FTRANSPORT', pageWidth / 2, 28, { align: 'center' });
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Bienvenue chez Ftransport !', pageWidth / 2, 48, { align: 'center' });

  // --- Corps ---
  let y = 72;

  // Salutation
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Bonjour ${apprenant.prenom} ${apprenant.nom},`, 20, y);
  y += 12;

  // Message de bienvenue
  const formationType = getFormationType(apprenant.type_apprenant);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const welcomeLines = doc.splitTextToSize(
    `Nous avons le plaisir de vous confirmer votre inscription a la formation ${formationType}. ` +
    `Afin de finaliser votre dossier, nous vous invitons a suivre les etapes ci-dessous.`,
    pageWidth - 40
  );
  doc.text(welcomeLines, 20, y);
  y += welcomeLines.length * 6 + 12;

  // --- Encadre etapes ---
  const boxH = 80;
  doc.setFillColor(240, 244, 248);
  doc.roundedRect(15, y, pageWidth - 30, boxH, 4, 4, 'F');
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, y, pageWidth - 30, boxH, 4, 4, 'S');

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 51, 102);
  doc.text('Les etapes pour completer votre inscription :', 25, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  const steps = [
    '1.  Inscrivez-vous sur le site de la CMA (Chambre des Metiers)',
    '2.  Telechargez vos documents obligatoires (piece d\'identite, justificatif de domicile)',
    '3.  Renseignez votre numero de dossier CMA et choisissez votre date d\'examen',
    '4.  Validez et envoyez votre dossier',
  ];

  steps.forEach((step) => {
    doc.text(step, 30, y);
    y += 11;
  });

  y += 18;

  // --- Bouton / lien ---
  const btnW = 160;
  const btnH = 28;
  const btnX = (pageWidth - btnW) / 2;

  doc.setFillColor(0, 102, 204);
  doc.roundedRect(btnX, y, btnW, btnH, 5, 5, 'F');

  // Texte du bouton
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Commencer mon inscription', pageWidth / 2, y + 11, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Cliquez sur le lien ci-dessous pour acceder au portail', pageWidth / 2, y + 20, { align: 'center' });

  // Zone cliquable invisible sur tout le bouton
  doc.link(btnX, y, btnW, btnH, { url: ONBOARDING_URL });

  y += btnH + 10;

  // URL visible et cliquable
  doc.setTextColor(0, 102, 204);
  doc.setFontSize(9);
  const linkWidth = doc.getTextWidth(ONBOARDING_URL);
  const linkX = (pageWidth - linkWidth) / 2;
  doc.textWithLink(ONBOARDING_URL, linkX, y, { url: ONBOARDING_URL });
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.3);
  doc.line(linkX, y + 1, linkX + linkWidth, y + 1);

  y += 22;

  // --- Contact ---
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(15, y, pageWidth - 30, 32, 4, 4, 'F');

  y += 12;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Pour toute question, contactez-nous :', 25, y);
  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.text(`Tel : ${COMPANY_INFO.phone}`, 25, y);
  doc.text(`Email : ${COMPANY_INFO.email}`, pageWidth / 2, y);

  // --- Date ---
  y += 22;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 140, 140);
  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  doc.text(`Document genere le ${today}`, 20, y);

  // --- Pied de page ---
  const footerY = pageHeight - 12;
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(
    `${COMPANY_INFO.name} - ${COMPANY_INFO.address} - SIRET : ${COMPANY_INFO.siret} - NAF : ${COMPANY_INFO.naf} - N° Declaration : ${COMPANY_INFO.declaration}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Telecharger
  doc.save(`bienvenue_ftransport_${apprenant.nom}_${apprenant.prenom}.pdf`);
  return doc;
}

function getFormationType(typeApprenant: string | null | undefined): string {
  const type = (typeApprenant || '').toLowerCase();

  if (type.includes('ta-e') || type === 'ta') {
    return 'TAXI (mobilite VTC vers TAXI)';
  }
  if (type.includes('va-e') || type === 'va') {
    return 'VTC (mobilite TAXI vers VTC)';
  }
  if (type.includes('taxi')) {
    return 'TAXI';
  }
  if (type.includes('vtc')) {
    return 'VTC';
  }

  return 'TAXI / VTC';
}
