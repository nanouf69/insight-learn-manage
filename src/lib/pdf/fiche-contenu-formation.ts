import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImage from '@/assets/logo-ftransport.png';

import { FORMATION_MODULES, type FormationDefinition } from '@/components/cours-en-ligne/modules-config';

// Data imports — cours/exercices par section
import { VTC_SECTIONS } from '@/components/cours-en-ligne/vtc-cours-data';
import { TAXI_SECTIONS } from '@/components/cours-en-ligne/taxi-cours-data';
import { TA_SECTIONS } from '@/components/cours-en-ligne/ta-cours-data';
import { VA_SECTIONS } from '@/components/cours-en-ligne/va-cours-data';

// Data imports — bilans exercices (détail par matière)
import { BILAN_EXERCICES_VTC } from '@/components/cours-en-ligne/bilan-exercices-vtc-data';
import { BILAN_EXERCICES_TAXI } from '@/components/cours-en-ligne/bilan-exercices-taxi-data';
import { BILAN_EXERCICES_TA } from '@/components/cours-en-ligne/bilan-exercices-ta-data';
import { BILAN_EXERCICES_VA } from '@/components/cours-en-ligne/bilan-exercices-va-data';

// Data imports — bilans examen (détail par matière)
import { BILAN_EXAMEN_VTC } from '@/components/cours-en-ligne/bilan-examen-vtc-data';
import { BILAN_EXAMEN_TAXI } from '@/components/cours-en-ligne/bilan-examen-taxi-data';
import { BILAN_EXAMEN_TA } from '@/components/cours-en-ligne/bilan-examen-ta-data';
import { BILAN_EXAMEN_VA } from '@/components/cours-en-ligne/bilan-examen-va-data';

// Data imports — examens blancs
import {
  bilanExamenVTC, bilanExamenTaxi, bilanExamenTA, bilanExamenVA,
  tousLesExamens,
} from '@/components/cours-en-ligne/examens-blancs-data';

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

// Bilan Exercices — détail par matière
const BILAN_EXERCICES_BY_MODULE: Record<number, { titre: string; questions?: any[] }[]> = {
  4: BILAN_EXERCICES_VTC,
  9: BILAN_EXERCICES_TAXI,
  27: BILAN_EXERCICES_TA,
  29: BILAN_EXERCICES_VA,
};

// Bilan Examen — détail par matière
const BILAN_EXAMEN_BY_MODULE: Record<number, { titre: string; questions?: any[] }[]> = {
  5: BILAN_EXAMEN_VTC,
  11: BILAN_EXAMEN_TAXI,
  28: BILAN_EXAMEN_TA,
  30: BILAN_EXAMEN_VA,
};

// Examens Blancs — nombre d'examens et matières
const EXAMENS_BLANCS_BY_MODULE: Record<number, { type: string }> = {
  35: { type: 'VTC' },
  36: { type: 'TAXI' },
  37: { type: 'TA' },
  38: { type: 'VA' },
};

// Modules with known static content
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
        rows.push(['', 'Quiz', sanitize(exo.titre) + qLabel]);
      });
    });
    return rows;
  }

  // Bilan Exercices — list each matière
  const bilanExo = BILAN_EXERCICES_BY_MODULE[moduleId];
  if (bilanExo) {
    bilanExo.forEach((matiere, i) => {
      const qCount = matiere.questions?.length || 0;
      rows.push([`${i + 1}`, 'Quiz', `${sanitize(matiere.titre)} (${qCount} questions)`]);
    });
    return rows;
  }

  // Bilan Examen — list each matière
  const bilanExam = BILAN_EXAMEN_BY_MODULE[moduleId];
  if (bilanExam) {
    bilanExam.forEach((matiere, i) => {
      const qCount = matiere.questions?.length || 0;
      rows.push([`${i + 1}`, 'Quiz', `${sanitize(matiere.titre)} (${qCount} questions)`]);
    });
    return rows;
  }

  // Examens Blancs — list matières from first exam + count
  const ebConfig = EXAMENS_BLANCS_BY_MODULE[moduleId];
  if (ebConfig) {
    const examens = tousLesExamens.filter(
      e => e.type === ebConfig.type && !e.id.startsWith('bilan')
    );
    const nbExamens = examens.length;
    rows.push(['', 'Examen', `${nbExamens} examens blancs avec chronometre et coefficients`]);
    if (examens.length > 0) {
      examens[0].matieres.forEach((m, i) => {
        rows.push([`${i + 1}`, '', `${sanitize(m.nom)} — ${m.duree} min, coeff. ${m.coefficient}`]);
      });
    }
    return rows;
  }

  // Static modules
  const statics = STATIC_MODULE_LABELS[moduleId];
  if (statics) {
    statics.forEach(label => rows.push(['', '', sanitize(label)]));
    return rows;
  }

  // Fallback
  rows.push(['', '', sanitize(moduleLabel)]);
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
  formation.modules.forEach((mod) => {
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
              data.cell.styles.textColor = [14, 165, 233];
            } else if (val === 'Quiz') {
              data.cell.styles.textColor = [245, 158, 11];
            } else if (val === 'Examen') {
              data.cell.styles.textColor = [239, 68, 68];
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
