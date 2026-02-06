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
  naf: '8559A',
  declaration: '11770762377',
};

const REGLEMENT_ARTICLES = [
  {
    title: 'Article 1 : Personne concernée',
    content: "Le présent règlement intérieur est établi conformément à la législation en vigueur (article L.922-1 à R.922-11 du Code du travail). Il s'applique aux personnes inscrites à une action de formation organisée par Ftransport."
  },
  {
    title: 'Article 2 : Conditions générales',
    content: "Toute personne en stage doit respecter le présent règlement pour toutes les questions relatives à l'application de la réglementation en matière d'hygiène et de sécurité."
  },
  {
    title: "Article 3 : Règles générales d'hygiène et de sécurité",
    content: "Chaque stagiaire doit veiller à sa sécurité personnelle et à celle des autres en respectant les consignes générales et particulières de sécurité et d'hygiène en vigueur sur les lieux de stage."
  },
  {
    title: 'Article 4 : Produits illicites et boissons alcoolisées',
    content: "Il est interdit de pénétrer dans les locaux de formation et d'hébergement avec des produits illicites ou des boissons alcoolisées."
  },
  {
    title: 'Article 5 : Consigne d\'incendie',
    content: "Les consignes d'incendie sont affichés dans les locaux. Tout stagiaire est tenu de respecter scrupuleusement les consignes relatives à la prévention des incendies."
  },
  {
    title: 'Article 6 : Interdiction de fumer',
    content: "Il est strictement interdit de fumer dans les lieux affectés à un usage collectif ainsi que dans les salles."
  },
  {
    title: 'Article 7 : Tenue et comportement',
    content: "Les stagiaires sont invités à se présenter en tenue décente et à avoir un comportement correct. L'usage du téléphone portable est strictement interdit dans les salles de formation."
  },
  {
    title: 'Article 8 : Horaires – absences et retards',
    content: "Les stagiaires doivent respecter les horaires de stage fixés par le responsable de formation. En cas d'absence ou de retard, les stagiaires doivent avertir le formateur."
  },
];

export async function generateReglementInterieurSigne(apprenant: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Logo en haut à gauche
  try {
    doc.addImage(logoImage, 'PNG', 15, 5, 45, 16);
  } catch (e) {
    console.log('Logo non chargé');
  }
  
  // En-tête (décalé pour le logo)
  doc.setFillColor(0, 51, 102);
  doc.rect(0, 25, pageWidth, 20, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RÈGLEMENT INTÉRIEUR', pageWidth / 2, 35, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Conditions générales applicables aux stagiaires', pageWidth / 2, 42, { align: 'center' });
  
  // Adresse
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.text(`${COMPANY_INFO.address}`, pageWidth / 2, 52, { align: 'center' });
  
  let y = 60;
  
  // Articles (version condensée)
  doc.setFontSize(8);
  
  for (const article of REGLEMENT_ARTICLES) {
    if (y > pageHeight - 80) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text(article.title, 15, y);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(article.content, pageWidth - 30);
    doc.text(lines, 15, y);
    y += lines.length * 4 + 6;
  }
  
  // Section signature
  y = Math.max(y, pageHeight - 70);
  
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(10, y - 5, pageWidth - 20, 55, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ACCEPTATION DU RÈGLEMENT', pageWidth / 2, y, { align: 'center' });
  y += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const fullName = `${apprenant.civilite || ''} ${apprenant.prenom} ${apprenant.nom}`.trim();
  doc.text(`Je soussigné(e), ${fullName}, déclare avoir pris connaissance du présent`, 15, y);
  y += 4;
  doc.text("règlement intérieur et m'engage à le respecter.", 15, y);
  y += 10;
  
  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  doc.text(`Fait à Lyon, le ${today}`, 15, y);
  y += 10;
  
  // Signatures côte à côte
  doc.text('Signature du stagiaire :', 15, y);
  doc.text("Cachet de l'organisme :", pageWidth / 2 + 10, y);
  y += 3;
  
  // Signature dirigeant (côté stagiaire on laisse vide ou on met celle de l'apprenant si disponible)
  try {
    doc.addImage(signatureImage, 'PNG', 15, y, 40, 20);
  } catch (e) {
    console.log('Signature non chargée');
  }
  
  // Tampon
  try {
    doc.addImage(tamponImage, 'PNG', pageWidth / 2 + 10, y, 50, 25);
  } catch (e) {
    console.log('Tampon non chargé');
  }
  
  // Pied de page
  const footerY = pageHeight - 10;
  doc.setFontSize(6);
  doc.setTextColor(128, 128, 128);
  doc.text(`${COMPANY_INFO.name} - SIRET: ${COMPANY_INFO.siret} - NAF: ${COMPANY_INFO.naf}`, pageWidth / 2, footerY, { align: 'center' });
  
  doc.save(`reglement_interieur_${apprenant.nom}_${apprenant.prenom}.pdf`);
}
