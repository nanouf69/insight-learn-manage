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
  doc.setFillColor(13, 37, 64); // #0D2540
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

  // Progress bar inside
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

    // Check page break
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    // Category header
    doc.setFillColor(13, 37, 64);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(categoryLabels[cat] || cat.toUpperCase(), margin + 4, y + 5.5);
    y += 12;

    // Items
    for (const item of catItems) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }

      // Status icon
      if (item.found) {
        doc.setFillColor(34, 197, 94);
      } else {
        doc.setFillColor(239, 68, 68);
      }
      doc.circle(margin + 4, y + 1.5, 2, 'F');

      // Label
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, margin + 10, y + 3);

      // Status text
      const statusText = item.found ? 'Present' : 'Manquant';
      doc.setFontSize(8);
      doc.setTextColor(item.found ? 34 : 239, item.found ? 197 : 68, item.found ? 94 : 68);
      doc.text(statusText, pageWidth - margin - 30, y + 3);

      // Date if available
      if (item.completedAt) {
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(7);
        try {
          const dateStr = format(new Date(item.completedAt), 'dd/MM/yyyy', { locale: fr });
          doc.text(dateStr, pageWidth - margin, y + 3, { align: 'right' });
        } catch (_) {}
      }

      y += 8;
    }

    y += 4;
  }

  // Footer
  y += 10;
  if (y > 260) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7);
  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  doc.text(`Document genere le ${today}`, margin, y);
  doc.text(`${COMPANY_INFO.name} - ${COMPANY_INFO.address}`, pageWidth / 2, y, { align: 'center' });

  // Save
  const fileName = `controle-qualite-${apprenant.prenom}-${apprenant.nom}.pdf`.replace(/\s+/g, '-').toLowerCase();
  doc.save(fileName);
}
