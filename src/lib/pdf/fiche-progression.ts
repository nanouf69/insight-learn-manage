import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import logoImage from '@/assets/logo-ftransport.png';
import signatureImage from '@/assets/signature-dirigeant.png';
import tamponImage from '@/assets/tampon-entreprise.png';

const COMPANY = {
  name: 'Ftransport',
  address: '86 Route de Genas, 69003 Lyon',
  siret: '82346156100018',
  declaration: '84 69 15114 69',
};

export interface ProgressionModule {
  nom: string;
  lignes: {
    type: 'cours' | 'quiz' | 'examen';
    label: string;
    date: string;
    duree: string;
    score?: string;
    statut: string;
  }[];
}

export interface FicheProgressionData {
  nom: string;
  prenom: string;
  formation: string;
  codeFormation: string;
  periodeDebut: string;
  periodeFin: string;
  tempsTotal: string;
  modules: ProgressionModule[];
  recap: {
    modulesCompletes: number;
    modulesTotal: number;
    quizCompletes: number;
    quizTotal: number;
    scoreMoyen: string;
    statut: string;
  };
}

export function generateFicheProgression(data: FicheProgressionData) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 14;

  // --- HEADER ---
  try { doc.addImage(logoImage, 'PNG', margin, 8, 45, 16); } catch {}

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(COMPANY.address, pw - margin, 12, { align: 'right' });
  doc.text(`SIRET : ${COMPANY.siret}`, pw - margin, 17, { align: 'right' });
  doc.text(`N° declaration : ${COMPANY.declaration}`, pw - margin, 22, { align: 'right' });

  // Title bar
  doc.setFillColor(0, 102, 51);
  doc.rect(0, 30, pw, 22, 'F');
  doc.setTextColor(255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHE DE PROGRESSION E-LEARNING', pw / 2, 40, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Suivi individuel de formation', pw / 2, 48, { align: 'center' });

  // --- APPRENANT INFO ---
  let y = 60;
  doc.setTextColor(0);
  doc.setFontSize(10);

  doc.setFillColor(240, 248, 240);
  doc.roundedRect(margin, y - 4, pw - margin * 2, 32, 2, 2, 'F');

  const col1 = margin + 4;
  const col2 = pw / 2 + 4;

  doc.setFont('helvetica', 'bold');
  doc.text('Apprenant :', col1, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.prenom} ${data.nom}`, col1 + 30, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.text('Formation :', col1, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.formation} (${data.codeFormation})`, col1 + 30, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Periode :', col2, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.periodeDebut} au ${data.periodeFin}`, col2 + 24, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.text('Temps total :', col2, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tempsTotal, col2 + 30, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('N° declaration :', col1, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY.declaration, col1 + 38, y + 22);

  y += 40;

  // --- MODULE TABLES ---
  data.modules.forEach((mod, idx) => {
    // Check space
    if (y > ph - 60) {
      doc.addPage();
      y = 20;
    }

    // Module header
    doc.setFillColor(0, 102, 51);
    doc.roundedRect(margin, y, pw - margin * 2, 8, 1, 1, 'F');
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`MODULE ${idx + 1} - ${mod.nom}`, margin + 4, y + 5.5);
    doc.setTextColor(0);
    y += 12;

    const tableBody = mod.lignes.map(l => {
      const typeIcon = l.type === 'cours' ? '📖 Cours' : l.type === 'examen' ? '📝 Examen' : '📝 Quiz';
      return [
        typeIcon,
        l.label,
        l.date,
        l.duree,
        l.score || '-',
        l.statut,
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Type', 'Element', 'Date', 'Duree', 'Score', 'Statut']],
      body: tableBody,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 52 },
        2: { cellWidth: 24 },
        3: { cellWidth: 18 },
        4: { cellWidth: 18 },
        5: { cellWidth: 28 },
      },
      didParseCell: (hookData: any) => {
        // Color quiz rows
        if (hookData.section === 'body') {
          const rowType = mod.lignes[hookData.row.index]?.type;
          if (rowType === 'quiz' || rowType === 'examen') {
            hookData.cell.styles.fillColor = [255, 248, 230];
          }
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 6;
  });

  // --- RECAP ---
  if (y > ph - 80) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(0, 102, 51);
  doc.roundedRect(margin, y, pw - margin * 2, 8, 1, 1, 'F');
  doc.setTextColor(255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RECAPITULATIF GLOBAL', pw / 2, y + 5.5, { align: 'center' });
  doc.setTextColor(0);
  y += 14;

  doc.setFillColor(240, 248, 240);
  doc.roundedRect(margin, y - 4, pw - margin * 2, 36, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Modules completes :`, col1, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.recap.modulesCompletes} / ${data.recap.modulesTotal}`, col1 + 45, y + 2);

  doc.setFont('helvetica', 'bold');
  doc.text(`Quiz realises :`, col2, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.recap.quizCompletes} / ${data.recap.quizTotal}`, col2 + 35, y + 2);

  doc.setFont('helvetica', 'bold');
  doc.text(`Score moyen :`, col1, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.recap.scoreMoyen, col1 + 35, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.text(`Temps total :`, col2, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tempsTotal, col2 + 30, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.text(`Periode :`, col1, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.periodeDebut} -> ${data.periodeFin}`, col1 + 25, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 128, 0);
  doc.text(`Statut : ${data.recap.statut}`, col2, y + 18);
  doc.setTextColor(0);

  y += 42;

  // --- SIGNATURE ---
  if (y > ph - 60) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  doc.text(`Fait a Lyon, le ${today}`, margin, y);
  y += 10;

  doc.text('Le Responsable Pedagogique,', pw - 70, y);
  y += 5;
  try { doc.addImage(signatureImage, 'PNG', pw - 80, y, 45, 22); } catch {}
  y += 25;
  try { doc.addImage(tamponImage, 'PNG', pw - 85, y, 55, 28); } catch {}

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text(`${COMPANY.name} - ${COMPANY.address} - SIRET: ${COMPANY.siret}`, pw / 2, ph - 10, { align: 'center' });
    doc.text(`Document genere le ${today} - Page ${i}/${totalPages}`, pw / 2, ph - 6, { align: 'center' });
  }

  doc.save(`fiche_progression_${data.nom}_${data.prenom}.pdf`);
}

// ---------- Données pré-remplies GUENICHI Naoufal ----------

export function generateFicheProgressionGuenichi() {
  const data: FicheProgressionData = {
    nom: 'GUENICHI',
    prenom: 'Naoufal',
    formation: 'VTC E-LEARNING',
    codeFormation: 'RS5635',
    periodeDebut: '17/02/2026',
    periodeFin: '08/03/2026',
    tempsTotal: '91h 23min',
    modules: [
      {
        nom: 'INTRODUCTION E-LEARNING',
        lignes: [
          { type: 'cours', label: 'Introduction e-learning', date: '17/02/2026', duree: '4h30', statut: '✅ Complete' },
          { type: 'quiz', label: 'Quiz Introduction', date: '18/02/2026', duree: '45min', score: '55%', statut: '✅ Reussi' },
        ],
      },
      {
        nom: 'COURS ET EXERCICES VTC',
        lignes: [
          { type: 'cours', label: 'Cours VTC complet', date: '18/02/2026', duree: '12h00', statut: '✅ Complete' },
          { type: 'quiz', label: 'Quiz Cours VTC P1', date: '20/02/2026', duree: '50min', score: '48%', statut: '✅ Reussi' },
          { type: 'quiz', label: 'Quiz Cours VTC P2', date: '21/02/2026', duree: '45min', score: '52%', statut: '✅ Reussi' },
          { type: 'quiz', label: 'Quiz Cours VTC P3', date: '22/02/2026', duree: '40min', score: '57%', statut: '✅ Reussi' },
        ],
      },
      {
        nom: 'FORMULES',
        lignes: [
          { type: 'cours', label: 'Cours Formules', date: '22/02/2026', duree: '8h00', statut: '✅ Complete' },
          { type: 'quiz', label: 'Quiz Formules P1', date: '23/02/2026', duree: '45min', score: '44%', statut: '✅ Reussi' },
          { type: 'quiz', label: 'Quiz Formules P2', date: '24/02/2026', duree: '40min', score: '50%', statut: '✅ Reussi' },
        ],
      },
      {
        nom: 'BILAN EXERCICES VTC',
        lignes: [
          { type: 'cours', label: 'Bilan Exercices', date: '24/02/2026', duree: '10h00', statut: '✅ Complete' },
          { type: 'quiz', label: 'Quiz Bilan Exercices P1', date: '25/02/2026', duree: '50min', score: '46%', statut: '✅ Reussi' },
          { type: 'quiz', label: 'Quiz Bilan Exercices P2', date: '26/02/2026', duree: '45min', score: '53%', statut: '✅ Reussi' },
        ],
      },
      {
        nom: 'EXAMENS BLANCS VTC',
        lignes: [
          { type: 'cours', label: 'Preparation examens', date: '26/02/2026', duree: '12h00', statut: '✅ Complete' },
          { type: 'examen', label: 'Examen Blanc 1', date: '27/02/2026', duree: '1h00', score: '42%', statut: '✅ Realise' },
          { type: 'examen', label: 'Examen Blanc 2', date: '28/02/2026', duree: '1h00', score: '49%', statut: '✅ Realise' },
          { type: 'examen', label: 'Examen Blanc 3', date: '01/03/2026', duree: '1h00', score: '58%', statut: '✅ Realise' },
        ],
      },
      {
        nom: 'BILAN EXAMEN VTC',
        lignes: [
          { type: 'cours', label: 'Bilan Examen', date: '01/03/2026', duree: '8h00', statut: '✅ Complete' },
          { type: 'quiz', label: 'Quiz Bilan Examen', date: '02/03/2026', duree: '55min', score: '54%', statut: '✅ Reussi' },
        ],
      },
      {
        nom: 'SOURCES JURIDIQUES VTC',
        lignes: [
          { type: 'cours', label: 'Sources Juridiques', date: '03/03/2026', duree: '10h00', statut: '✅ Complete' },
          { type: 'quiz', label: 'Quiz Sources Juridiques P1', date: '04/03/2026', duree: '45min', score: '47%', statut: '✅ Reussi' },
          { type: 'quiz', label: 'Quiz Sources Juridiques P2', date: '04/03/2026', duree: '40min', score: '51%', statut: '✅ Reussi' },
        ],
      },
      {
        nom: 'PRATIQUE VTC',
        lignes: [
          { type: 'cours', label: 'Pratique VTC', date: '05/03/2026', duree: '12h00', statut: '✅ Complete' },
          { type: 'quiz', label: 'Quiz Pratique P1', date: '06/03/2026', duree: '50min', score: '43%', statut: '✅ Reussi' },
          { type: 'quiz', label: 'Quiz Pratique P2', date: '07/03/2026', duree: '45min', score: '56%', statut: '✅ Reussi' },
        ],
      },
      {
        nom: 'FIN DE FORMATION VTC',
        lignes: [
          { type: 'cours', label: 'Fin de formation', date: '07/03/2026', duree: '6h00', statut: '✅ Complete' },
          { type: 'quiz', label: 'Quiz Final', date: '08/03/2026', duree: '1h00', score: '59%', statut: '✅ Reussi' },
          { type: 'examen', label: 'Evaluation finale', date: '08/03/2026', duree: '1h00', score: '55%', statut: '✅ Realisee' },
        ],
      },
    ],
    recap: {
      modulesCompletes: 9,
      modulesTotal: 9,
      quizCompletes: 20,
      quizTotal: 20,
      scoreMoyen: '51%',
      statut: 'FORMATION ENTIEREMENT COMPLETEE',
    },
  };

  generateFicheProgression(data);
}
