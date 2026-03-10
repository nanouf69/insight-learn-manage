import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImage from '@/assets/logo-ftransport.png';

import { FORMATION_MODULES, type FormationDefinition } from '@/components/cours-en-ligne/modules-config';

// Data imports
import { VTC_SECTIONS } from '@/components/cours-en-ligne/vtc-cours-data';
import { TAXI_SECTIONS } from '@/components/cours-en-ligne/taxi-cours-data';
import { TA_SECTIONS } from '@/components/cours-en-ligne/ta-cours-data';
import { VA_SECTIONS } from '@/components/cours-en-ligne/va-cours-data';

const COMPANY = {
  name: 'Ftransport',
  address: '86 Route de Genas, 69003 Lyon',
  siret: '82346156100018',
  declaration: '84 69 15114 69',
};

// Map module IDs to their sections data
interface SectionData {
  cours: { titre: string; sousTitre?: string }[];
  exercices: { titre: string; sousTitre?: string; questions?: any[] }[];
}

const SECTIONS_BY_MODULE_ID: Record<number, SectionData[]> = {
  2: VTC_SECTIONS as SectionData[],
  10: TAXI_SECTIONS as SectionData[],
  40: TA_SECTIONS as SectionData[],
  41: VA_SECTIONS as SectionData[],
};

// Modules with known static content (no detailed breakdown needed)
const STATIC_MODULE_LABELS: Record<number, string[]> = {
  1: ['Introduction Presentiel'],
  26: ['Introduction E-learning'],
  31: ['Introduction TA'],
  32: ['Introduction TA E-learning'],
  33: ['Introduction VA'],
  34: ['Introduction VA E-learning'],
  3: ['Formules de calcul'],
  60: ['Sources Legales VTC (PDF)'],
  61: ['Sources Legales TAXI (PDF)'],
  62: ['Sources Legales TA (PDF)'],
  63: ['Sources Legales VA (PDF)'],
  7: ['Connaissances de la Ville - Quiz interactif'],
  64: ['Equipements TAXI - 10 questions QCM'],
  12: ['Cas Pratique TAXI'],
  13: ['Controle de connaissances TAXI'],
  6: ['Pratique TAXI - Parcours avec lieux de Lyon'],
  8: ['Pratique VTC - Parcours avec lieux de Lyon'],
  50: ['Evaluation des acquis', 'Questionnaire de satisfaction', 'CGV & Reglement'],
  51: ['Evaluation des acquis', 'Questionnaire de satisfaction', 'CGV & Reglement'],
  52: ['Evaluation des acquis', 'Questionnaire de satisfaction', 'CGV & Reglement'],
  53: ['Evaluation des acquis', 'Questionnaire de satisfaction', 'CGV & Reglement'],
};

// Bilan modules
const BILAN_EXERCICES_LABELS: Record<number, string> = {
  4: 'Bilan Exercices VTC — Quiz recapitulatif toutes matieres',
  9: 'Bilan Exercices TAXI — Quiz recapitulatif toutes matieres',
  27: 'Bilan Exercices TA — Quiz Regl. Nationale + Locale',
  29: 'Bilan Exercices VA — Quiz Dev. Commercial + Regl. Specifique',
};

const BILAN_EXAMEN_LABELS: Record<number, string> = {
  5: 'Bilan Examen VTC — Dev. Commercial + Regl. Specifique VTC',
  11: 'Bilan Examen TAXI — Regl. Nationale + Regl. Locale',
  28: 'Bilan Examen TA — Regl. Nationale + Regl. Locale',
  30: 'Bilan Examen VA — Dev. Commercial + Regl. Specifique VTC',
};

const EXAMENS_BLANCS_LABELS: Record<number, string> = {
  35: 'Examens Blancs VTC — Simulations chrono avec coefficients',
  36: 'Examens Blancs TAXI — Simulations chrono avec coefficients',
  37: 'Examens Blancs TA — Simulations chrono avec coefficients',
  38: 'Examens Blancs VA — Simulations chrono avec coefficients',
};

function sanitize(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[🔓📖📝📋📕📗📘📙📓🚕]/g, '')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function buildModuleRows(moduleId: number, moduleLabel: string): string[][] {
  const rows: string[][] = [];
  const cleanLabel = sanitize(moduleLabel);

  // Check for cours+exercices modules with sections
  const sections = SECTIONS_BY_MODULE_ID[moduleId];
  if (sections) {
    const subjectNums: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7 };
    const partBySubject: Record<number, number> = {};

    sections.forEach((section) => {
      section.cours.forEach((cours) => {
        const subjectLetter = cours.titre.match(/^\s*([A-G])\./i)?.[1]?.toUpperCase() || 'A';
        const subjectNum = subjectNums[subjectLetter] || 1;
        const nextPart = (partBySubject[subjectNum] || 0) + 1;
        partBySubject[subjectNum] = nextPart;
        rows.push([`${subjectNum}.${nextPart}`, 'Cours', sanitize(cours.titre)]);
      });

      section.exercices.forEach((exo) => {
        const qCount = exo.questions?.length || 0;
        const qLabel = qCount > 0 ? ` (${qCount} questions)` : '';
        // Use the last subject number
        const lastSubject = Object.keys(partBySubject).length > 0
          ? Math.max(...Object.values(partBySubject).map((_, i) => Number(Object.keys(partBySubject)[i])))
          : 1;
        rows.push(['', 'Quiz', sanitize(exo.titre) + qLabel]);
      });
    });
    return rows;
  }

  // Bilan Exercices
  if (BILAN_EXERCICES_LABELS[moduleId]) {
    rows.push(['', 'Quiz', sanitize(BILAN_EXERCICES_LABELS[moduleId])]);
    return rows;
  }

  // Bilan Examen
  if (BILAN_EXAMEN_LABELS[moduleId]) {
    rows.push(['', 'Quiz', sanitize(BILAN_EXAMEN_LABELS[moduleId])]);
    return rows;
  }

  // Examens Blancs
  if (EXAMENS_BLANCS_LABELS[moduleId]) {
    rows.push(['', 'Examen', sanitize(EXAMENS_BLANCS_LABELS[moduleId])]);
    return rows;
  }

  // Static modules
  const statics = STATIC_MODULE_LABELS[moduleId];
  if (statics) {
    statics.forEach(label => rows.push(['', '', sanitize(label)]));
    return rows;
  }

  // Fallback
  rows.push(['', '', cleanLabel]);
  return rows;
}

export function generateFicheContenuFormation(formationKey: string) {
  const formation = FORMATION_MODULES[formationKey];
  if (!formation) {
    throw new Error(`Formation "${formationKey}" introuvable`);
  }

  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const margin = 14;

  // --- HEADER ---
  try { doc.addImage(logoImage, 'PNG', margin, 8, 45, 16); } catch {}

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(COMPANY.address, pw - margin, 12, { align: 'right' });
  doc.text(`SIRET : ${COMPANY.siret}`, pw - margin, 17, { align: 'right' });
  doc.text(`N. declaration : ${COMPANY.declaration}`, pw - margin, 22, { align: 'right' });

  // --- TITLE ---
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(margin, 30, pw - margin, 30);

  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text(`FICHE DE CONTENU PEDAGOGIQUE`, pw / 2, 40, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(16, 185, 129);
  doc.text(sanitize(formation.label), pw / 2, 48, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`${formation.modules.length} modules`, pw / 2, 54, { align: 'center' });

  let y = 62;

  // --- FOR EACH MODULE ---
  formation.modules.forEach((mod, modIndex) => {
    const moduleTitle = `${sanitize(mod.label)}`;
    const detailRows = buildModuleRows(mod.id, mod.label);

    // Check if we need a new page
    const estimatedHeight = 12 + detailRows.length * 7;
    if (y + estimatedHeight > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }

    // Module header
    doc.setFillColor(240, 253, 244);
    doc.rect(margin, y - 4, pw - margin * 2, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(30);
    doc.setFont('helvetica', 'bold');
    doc.text(moduleTitle, margin + 3, y + 1);
    doc.setFont('helvetica', 'normal');
    y += 10;

    // Detail table
    if (detailRows.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin + 2, right: margin },
        head: [['#', 'Type', 'Contenu']],
        body: detailRows,
        styles: { fontSize: 8, cellPadding: 2, textColor: [50, 50, 50] },
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 'auto' },
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const val = String(data.cell.raw);
            if (val === 'Cours') {
              data.cell.styles.textColor = [14, 165, 233]; // sky
            } else if (val === 'Quiz') {
              data.cell.styles.textColor = [245, 158, 11]; // amber
            } else if (val === 'Examen') {
              data.cell.styles.textColor = [239, 68, 68]; // red
            }
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  });

  // --- FOOTER ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `${COMPANY.name} - Fiche contenu ${sanitize(formation.label)} - Page ${i}/${pageCount}`,
      pw / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  doc.save(`Fiche_Contenu_${sanitize(formation.label).replace(/\s+/g, '_')}.pdf`);
  return doc;
}

/** Generate fiches for all formations */
export function generateAllFichesContenu() {
  const keys = ['vtc', 'taxi', 'ta', 'va'];
  keys.forEach(k => generateFicheContenuFormation(k));
}
