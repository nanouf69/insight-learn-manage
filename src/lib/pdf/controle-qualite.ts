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
};

interface ControleItem {
  label: string;
  category: string;
  found: boolean;
  completedAt?: string;
  donnees?: any;
}

// Human-readable labels for common JSON keys
const KEY_LABELS: Record<string, string> = {
  nom: 'Nom',
  prenom: 'Prenom',
  email: 'Email',
  telephone: 'Telephone',
  adresse: 'Adresse',
  code_postal: 'Code postal',
  ville: 'Ville',
  date_naissance: 'Date de naissance',
  date: 'Date',
  signature: 'Signature',
  signature_apprenant: 'Signature apprenant',
  signature_formateur: 'Signature formateur',
  commentaire: 'Commentaire',
  commentaires: 'Commentaires',
  reponse: 'Reponse',
  reponses: 'Reponses',
  note: 'Note',
  formation: 'Formation',
  type_formation: 'Type de formation',
  civilite: 'Civilite',
  statut: 'Statut',
  experience: 'Experience',
  motivation: 'Motivation',
  objectifs: 'Objectifs',
  points_forts: 'Points forts',
  points_amelioration: 'Points a ameliorer',
  satisfaction_globale: 'Satisfaction globale',
  recommandation: 'Recommandation',
  qualite_contenu: 'Qualite du contenu',
  qualite_formateur: 'Qualite du formateur',
  organisation: 'Organisation',
  supports: 'Supports pedagogiques',
};

function formatKey(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, s => s.toUpperCase());
}

function isBase64Image(value: string): boolean {
  return typeof value === 'string' && (value.startsWith('data:image/') || (value.length > 500 && /^[A-Za-z0-9+/=]+$/.test(value.slice(0, 100))));
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 280) {
    doc.addPage();
    return 20;
  }
  return y;
}

/**
 * Render donnees content into the PDF, handling nested objects/arrays
 */
function renderDonnees(doc: jsPDF, donnees: any, startY: number, margin: number, pageWidth: number): number {
  let y = startY;
  const maxTextWidth = pageWidth - margin * 2 - 15;

  if (!donnees || typeof donnees !== 'object') return y;

  const entries = Array.isArray(donnees)
    ? donnees.map((item, i) => [`${i + 1}`, item] as [string, any])
    : Object.entries(donnees);

  for (const [key, value] of entries) {
    // Skip internal/technical fields
    if (key === 'id' || key === 'apprenant_id' || key === 'user_id' || key === 'module_id') continue;

    // Skip base64 signatures (too long for PDF text)
    if (typeof value === 'string' && isBase64Image(value)) {
      y = ensureSpace(doc, y, 10);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(`${formatKey(key)} :`, margin + 5, y);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text('[Signature numerique presente]', margin + 55, y);
      y += 6;
      continue;
    }

    // Nested object
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      y = ensureSpace(doc, y, 12);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 37, 64);
      doc.text(`${formatKey(key)} :`, margin + 5, y);
      y += 6;
      y = renderDonnees(doc, value, y, margin + 5, pageWidth);
      y += 2;
      continue;
    }

    // Array of primitives or objects
    if (Array.isArray(value)) {
      y = ensureSpace(doc, y, 12);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 37, 64);
      doc.text(`${formatKey(key)} :`, margin + 5, y);
      y += 6;

      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (typeof item === 'object' && item !== null) {
          y = ensureSpace(doc, y, 8);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(80, 80, 80);
          doc.text(`#${i + 1}`, margin + 8, y);
          y += 5;
          y = renderDonnees(doc, item, y, margin + 8, pageWidth);
          y += 2;
        } else {
          y = ensureSpace(doc, y, 6);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 30, 30);
          const text = `- ${String(item)}`;
          const lines = doc.splitTextToSize(text, maxTextWidth - 10);
          doc.text(lines, margin + 8, y);
          y += lines.length * 4 + 1;
        }
      }
      y += 2;
      continue;
    }

    // Simple key-value
    y = ensureSpace(doc, y, 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    const label = `${formatKey(key)} : `;
    doc.text(label, margin + 5, y);

    const labelWidth = doc.getTextWidth(label);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);

    const strValue = value === null || value === undefined ? '-' : String(value);
    const remainingWidth = maxTextWidth - labelWidth - 5;

    if (remainingWidth > 20 && doc.getTextWidth(strValue) <= remainingWidth) {
      doc.text(strValue, margin + 5 + labelWidth, y);
      y += 5;
    } else {
      y += 5;
      const wrappedLines = doc.splitTextToSize(strValue, maxTextWidth - 5);
      for (const line of wrappedLines) {
        y = ensureSpace(doc, y, 5);
        doc.text(line, margin + 8, y);
        y += 4;
      }
      y += 1;
    }
  }

  return y;
}

export function generateControleQualitePdf(
  apprenant: any,
  items: ControleItem[],
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Logo
  try {
    doc.addImage(logoImage, 'PNG', margin, 8, 45, 16);
  } catch (_) {}

  // Company info top-right
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(COMPANY_INFO.name, pageWidth - margin, 12, { align: 'right' });
  doc.text(COMPANY_INFO.address, pageWidth - margin, 16, { align: 'right' });
  doc.text(`SIRET : ${COMPANY_INFO.siret}`, pageWidth - margin, 20, { align: 'right' });

  // Header bar
  doc.setFillColor(13, 37, 64);
  doc.rect(0, 28, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTROLE QUALITE - DOSSIER APPRENANT', pageWidth / 2, 40, { align: 'center' });

  // Apprenant info
  doc.setTextColor(0, 0, 0);
  let y = 58;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const fullName = `${apprenant.civilite || ''} ${apprenant.prenom} ${apprenant.nom}`.trim();
  doc.text(`Stagiaire : ${fullName}`, margin, y);

  doc.setFont('helvetica', 'normal');
  const formation = (apprenant.type_apprenant || apprenant.formation_choisie || '-').toUpperCase();
  doc.text(`Formation : ${formation}`, pageWidth / 2, y);
  y += 7;

  if (apprenant.date_debut_formation) {
    doc.text(`Debut : ${apprenant.date_debut_formation}`, margin, y);
  }
  if (apprenant.date_fin_formation) {
    doc.text(`Fin : ${apprenant.date_fin_formation}`, pageWidth / 2, y);
  }
  y += 5;

  // Summary bar
  const totalDocs = items.length;
  const completedCount = items.filter(i => i.found).length;
  const pct = Math.round((completedCount / totalDocs) * 100);

  y += 5;
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text(`Completude du dossier : ${completedCount} / ${totalDocs} documents (${pct}%)`, margin + 5, y + 9);

  // Progress bar
  const barX = pageWidth - margin - 65;
  const barW = 60;
  const barH = 6;
  const barY = y + 4;
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(barX, barY, barW, barH, 2, 2, 'F');
  const fillColor = pct === 100 ? [34, 197, 94] : pct >= 50 ? [245, 158, 11] : [239, 68, 68];
  doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
  if (pct > 0) {
    doc.roundedRect(barX, barY, Math.max(4, (barW * pct) / 100), barH, 2, 2, 'F');
  }

  y += 22;

  // Categories
  const categoryLabels: Record<string, string> = {
    formulaire: 'FORMULAIRES STAGIAIRE',
    suivi: 'SUIVI PEDAGOGIQUE',
    administratif: 'DOCUMENTS ADMINISTRATIFS',
  };

  const categories = ['formulaire', 'suivi', 'administratif'];

  for (const cat of categories) {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length === 0) continue;

    y = ensureSpace(doc, y, 15);

    // Category header
    doc.setFillColor(13, 37, 64);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(categoryLabels[cat] || cat.toUpperCase(), margin + 4, y + 5.5);
    y += 12;

    for (const item of catItems) {
      y = ensureSpace(doc, y, 12);

      // Status dot
      if (item.found) {
        doc.setFillColor(34, 197, 94);
      } else {
        doc.setFillColor(239, 68, 68);
      }
      doc.circle(margin + 4, y + 1.5, 2, 'F');

      // Label
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, margin + 10, y + 3);

      // Status + date
      const statusText = item.found ? 'Present' : 'Manquant';
      doc.setFontSize(8);
      doc.setTextColor(item.found ? 34 : 239, item.found ? 197 : 68, item.found ? 94 : 68);
      doc.text(statusText, pageWidth - margin - 30, y + 3);

      if (item.completedAt) {
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(7);
        try {
          const dateStr = format(new Date(item.completedAt), 'dd/MM/yyyy', { locale: fr });
          doc.text(dateStr, pageWidth - margin, y + 3, { align: 'right' });
        } catch (_) {}
      }

      y += 8;

      // === Render detailed content (donnees) ===
      if (item.donnees && item.found) {
        // Light background box
        const boxStartY = y;
        y += 2;

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin + 8, y - 1, pageWidth - margin, y - 1);
        y += 2;

        y = renderDonnees(doc, item.donnees, y, margin + 2, pageWidth);

        y += 3;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin + 8, y, pageWidth - margin, y);
        y += 4;
      }
    }

    y += 4;
  }

  // Footer
  y += 10;
  y = ensureSpace(doc, y, 15);

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7);
  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  doc.text(`Document genere le ${today}`, margin, y);
  doc.text(`${COMPANY_INFO.name} - ${COMPANY_INFO.address}`, pageWidth / 2, y, { align: 'center' });

  // Save
  const fileName = `controle-qualite-${apprenant.prenom}-${apprenant.nom}.pdf`.replace(/\s+/g, '-').toLowerCase();
  doc.save(fileName);
}
