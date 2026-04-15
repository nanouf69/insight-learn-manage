import jsPDF from 'jspdf';
import { format, differenceInMinutes, parseISO } from 'date-fns';
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

// Fonction pour obtenir le nom de formation lisible selon le type d'apprenant
function getFormationName(typeApprenant: string | null): string {
  const type = (typeApprenant || '').toLowerCase();
  
  if (type.includes('ta')) {
    return 'Formation TAXI pour chauffeurs VTC';
  }
  if (type.includes('va')) {
    return 'Formation VTC pour chauffeurs TAXI';
  }
  if (type.includes('taxi')) {
    return 'Formation TAXI';
  }
  if (type.includes('vtc')) {
    return 'Formation VTC';
  }
  
  return 'Formation VTC'; // Défaut
}

interface SessionInfo {
  type_session: string;
  heure_debut?: string | null;
  heure_fin?: string | null;
  date_debut: string;
  date_fin: string;
}

interface ConnexionInfo {
  started_at: string;
  ended_at?: string | null;
  last_seen_at?: string | null;
}

function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(':').map(Number);
  return { h: h || 0, m: m || 0 };
}

function calculateSessionHours(sessions: SessionInfo[], type: string): number {
  let totalMinutes = 0;
  for (const s of sessions) {
    if (s.type_session?.toLowerCase() !== type) continue;
    if (s.heure_debut && s.heure_fin) {
      const start = parseTime(s.heure_debut);
      const end = parseTime(s.heure_fin);
      const mins = (end.h * 60 + end.m) - (start.h * 60 + start.m);
      if (mins > 0) totalMinutes += mins;
    } else {
      // Fallback: 7h par jour pour pratique, estimation
      totalMinutes += 7 * 60;
    }
  }
  return Math.round(totalMinutes / 60 * 10) / 10;
}

function calculateElearningHours(connexions: ConnexionInfo[]): number {
  let totalMinutes = 0;
  for (const c of connexions) {
    const start = new Date(c.started_at);
    const end = c.ended_at ? new Date(c.ended_at) : (c.last_seen_at ? new Date(c.last_seen_at) : null);
    if (end) {
      const mins = differenceInMinutes(end, start);
      if (mins > 0 && mins <= 420) { // max 7h
        totalMinutes += mins;
      }
    }
  }
  return Math.round(totalMinutes / 60 * 10) / 10;
}

function formatHours(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

export async function generateAttestationFinFormation(
  apprenant: any,
  sessions: SessionInfo[] = [],
  connexions: ConnexionInfo[] = []
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Logo en haut à gauche
  try {
    doc.addImage(logoImage, 'PNG', 15, 8, 50, 18);
  } catch (e) {
    console.log('Logo non chargé');
  }
  
  // En-tête
  doc.setFillColor(0, 102, 51);
  doc.rect(0, 30, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text("ATTESTATION DE FIN DE FORMATION", pageWidth / 2, 45, { align: 'center' });
  
  // Corps
  doc.setTextColor(0, 0, 0);
  let y = 65;
  
  doc.setFontSize(11);
  doc.text('Je soussigné, Directeur de ' + COMPANY_INFO.name + ',', 20, y);
  y += 10;
  
  doc.text('atteste que :', 20, y);
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
  
  doc.text('a suivi avec assiduité et a terminé la formation suivante :', 20, y);
  y += 12;
  
  // Calcul des heures
  const practicalSessions = sessions.filter(s => s.type_session?.toLowerCase() === 'pratique');
  const heuresPratique = calculateSessionHours(sessions, 'pratique');
  const heuresElearning = calculateElearningHours(connexions);
  const heuresTotal = heuresPratique + heuresElearning;
  
  // Formation box — agrandir pour les heures
  const boxHeight = 80;
  doc.setFillColor(232, 245, 233);
  doc.roundedRect(15, y - 5, pageWidth - 30, boxHeight, 3, 3, 'F');
  
  const formationName = getFormationName(apprenant.type_apprenant);
  doc.setFont('helvetica', 'bold');
  doc.text(`Formation : ${formationName}`, 20, y + 5);
  y += 12;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Date de début : ${apprenant.date_debut_formation || '-'}`, 20, y + 5);
  y += 8;
  doc.text(`Date de fin : ${apprenant.date_fin_formation || '-'}`, 20, y + 5);
  y += 8;
  doc.text(`Lieu : ${COMPANY_INFO.address}`, 20, y + 5);
  y += 12;
  
  // Détail des heures
  doc.setFont('helvetica', 'bold');
  doc.text(`Durée de la formation à distance (e-learning) : ${formatHours(heuresElearning)}`, 20, y + 5);
  y += 8;
  doc.text(`Durée de la formation pratique : ${formatHours(heuresPratique)} (${practicalSessions.length} session${practicalSessions.length > 1 ? 's' : ''})`, 20, y + 5);
  y += 10;
  
  // Total
  doc.setFontSize(12);
  doc.text(`Durée totale de la formation : ${formatHours(heuresTotal)}`, 20, y + 5);
  doc.setFontSize(11);
  y += boxHeight - 48; // position after box
  
  // Mention
  y += 10;
  doc.setFont('helvetica', 'italic');
  doc.text("Cette attestation est délivrée pour servir et valoir ce que de droit.", 20, y);
  
  // Date et signature
  y += 20;
  doc.setFont('helvetica', 'normal');
  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  doc.text(`Fait à Lyon, le ${today}`, 20, y);
  y += 20;
  
  doc.text('Le Directeur,', pageWidth - 60, y);
  y += 5;
  
  // Signature
  try {
    doc.addImage(signatureImage, 'PNG', pageWidth - 80, y, 50, 25);
    y += 30;
  } catch (e) {
    y += 30;
  }
  
  // Tampon
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
  
  doc.save(`attestation_fin_formation_${apprenant.nom}_${apprenant.prenom}.pdf`);
}
