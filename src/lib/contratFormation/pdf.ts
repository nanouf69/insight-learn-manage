import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TrainingContract, validateContract } from './model';
import { contractSections } from './text';

function printable(s: string) { return s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[^\x20-\xFF\n]/g, ''); }
export function buildTrainingContractPdf(c: TrainingContract, now: Date, definitive = false) {
  const validation = validateContract(c, c.learnerId, now);
  if (definitive && !validation.ready) throw new Error('Contrat incomplet ou dates incompatibles : brouillon uniquement');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 22; const left = 18; const width = 174;
  const next = () => { doc.addPage(); y = 22; };
  const paragraph = (text: string, heading = false) => {
    doc.setFont('helvetica', heading ? 'bold' : 'normal'); doc.setFontSize(heading ? 13 : 10);
    const lines = doc.splitTextToSize(printable(text), width) as string[];
    for (const line of lines) { if (y > 270) next(); doc.text(line, left, y); y += heading ? 6.5 : 4.7; }
    y += heading ? 3 : 5;
  };
  for (const section of contractSections(c, now, !definitive)) {
    if (section.title.startsWith('Annexe 2') || section.title === 'Références légales') next();
    else if (y > 242) next();
    paragraph(section.title, true); paragraph(section.text);
    if (section.title === 'Annexe 1 Programme et valorisation') {
      autoTable(doc, {
        startY: y, margin: { left, right: left, top: 22, bottom: 23 },
        head: [['Module / activités', 'Modalité', 'Durée (h)', 'Évaluation / suivi', 'Valeur EUR']],
        body: c.activities.map(a => [printable(`${a.title}\n${a.activities}`), printable(a.modality || '[À compléter]'), a.hours || '?', printable(a.evaluation || '[À compléter]'), a.value || '?']),
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: [35, 50, 65] },
        columnStyles: { 0: { cellWidth: 59 }, 1: { cellWidth: 24 }, 2: { cellWidth: 19 }, 3: { cellWidth: 49 }, 4: { cellWidth: 23 } },
        rowPageBreak: 'avoid',
      });
      const last = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
      y = (last?.finalY ?? y) + 8;
    }
  }
  const count = doc.getNumberOfPages();
  for (let i=1;i<=count;i++) {
    doc.setPage(i); doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text(printable(`${c.reference} | ${definitive ? 'Non signe - conclusion non etablie' : validation.status} | ${validation.today}`), left, 12);
    doc.text(`${i} / ${count}`, 192, 286, { align: 'right' });
  }
  return doc;
}