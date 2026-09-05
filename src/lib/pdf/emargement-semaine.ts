import jsPDF from 'jspdf';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import logoImage from '@/assets/logo-ftransport.png';

const COMPANY = {
  name: 'Ftransport',
  address: '86 Route de Genas 69003 Lyon',
  siret: '53516371400044',
};

const buildDemiLabels = (isFC: boolean): Record<string, string> => ({
  matin: 'Matin (09h-12h)',
  apres_midi: isFC ? 'Après-midi (13h-17h)' : 'Après-midi (13h-16h)',
  soir: 'Soir (17h-21h)',
  soir_1: 'Soir 1 (17h-18h30)',
  soir_2: 'Soir 2 (18h30-21h)',
});

// Formation continue (VTC ou TAXI) => créneau après-midi 13h-17h (4 signatures / 2 jours)
const isFormationContinue = (type?: string): boolean => {
  if (!type) return false;
  const t = type.toLowerCase().replace(/[_\s]+/g, '-');
  const hasKind = /(^|[-])(vtc|taxi)([-]|$)/.test(t) || t.includes('mobilite');
  const hasFC = t.includes('continue') || /(^|[-])fc([-]|$)/.test(t) || t.includes('mobilite');
  return hasKind && hasFC;
};



const DEMI_ORDER = ['matin', 'apres_midi', 'soir', 'soir_1', 'soir_2'];

export interface WeekEmargementSignature {
  date: string; // YYYY-MM-DD
  demi_journee: string;
  signed_at: string;
  signature: string;
  confirme_presence_lieu?: boolean;
  confirme_identite?: boolean;
}

export function generateEmargementSemainePdf(
  apprenant: { nom: string; prenom: string; civilite?: string; type_apprenant?: string },
  weekLabel: string,
  weekStart: string,
  weekEnd: string,
  signatures: WeekEmargementSignature[],
  formateurNom: string = 'GUENICHI Naoufal',
  opts?: { returnBlob?: boolean },
): { blob: Blob; fileName: string } | void {
  const isFCVtc = isFormationContinue(apprenant.type_apprenant);
  const DEMI_LABELS = buildDemiLabels(isFCVtc);
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header
  try { doc.addImage(logoImage, 'PNG', margin, 8, 45, 16); } catch {}
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(COMPANY.name, pw - margin, 12, { align: 'right' });
  doc.text(COMPANY.address, pw - margin, 16, { align: 'right' });
  doc.text(`SIRET : ${COMPANY.siret}`, pw - margin, 20, { align: 'right' });

  // Title banner
  doc.setFillColor(13, 37, 64);
  doc.rect(0, 28, pw, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  const isFCHeader = isFormationContinue(apprenant.type_apprenant);
  doc.text(`FEUILLE D'ÉMARGEMENT HEBDOMADAIRE`, pw / 2, isFCHeader ? 36 : 39, { align: 'center' });
  if (isFCHeader) {
    doc.setFontSize(10);
    doc.text('DURÉE TOTALE : 14H — 09h00-12h00 / 13h00-17h00', pw / 2, 43, { align: 'center' });
  }

  // Apprenant box
  let y = 56;
  const fullName = `${apprenant.civilite || ''} ${apprenant.prenom} ${apprenant.nom}`.trim();
  doc.setFillColor(240, 245, 250);
  doc.rect(margin, y - 4, pw - margin * 2, 30, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 37, 64);
  doc.text(`Stagiaire : ${fullName}`, margin + 4, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Formation : ${(apprenant.type_apprenant || '-').toUpperCase()}`, margin + 4, y + 9);
  doc.text(`Période : du ${format(parseISO(weekStart), 'dd/MM/yyyy')} au ${format(parseISO(weekEnd), 'dd/MM/yyyy')}`, margin + 4, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 37, 64);
  doc.text(`Formateur : ${formateurNom}`, margin + 4, y + 23);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 37, 64);
  doc.text(weekLabel, pw - margin - 4, y + 2, { align: 'right' });
  y += 34;

  // Group signatures by date
  const byDate = new Map<string, WeekEmargementSignature[]>();
  for (const sig of signatures) {
    if (!byDate.has(sig.date)) byDate.set(sig.date, []);
    byDate.get(sig.date)!.push(sig);
  }

  // Détecter si formation du soir
  const isSoir = signatures.some(s => s.demi_journee.startsWith('soir'));
  const defaultDemis = isSoir ? ['soir_1', 'soir_2'] : ['matin', 'apres_midi'];

  // Construire les 5 jours Lundi-Vendredi de la semaine
  const weekStartDate = parseISO(weekStart);
  const allDates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);
    allDates.push(format(d, 'yyyy-MM-dd'));
  }
  const sortedDates = allDates;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 37, 64);
  doc.text(`Signatures (${signatures.length})`, margin, y);
  y += 6;

  const rowH = 36;
  const dateColW = 38;
  const demiColW = 36;
  const sigColW = pw - margin * 2 - dateColW - demiColW;

  // Table header
  doc.setFillColor(13, 37, 64);
  doc.rect(margin, y, pw - margin * 2, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Jour', margin + 2, y + 5.5);
  doc.text('Demi-journée', margin + dateColW + 2, y + 5.5);
  doc.text('Signature du stagiaire', margin + dateColW + demiColW + 2, y + 5.5);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  for (const date of sortedDates) {
    const existingSigs = (byDate.get(date) || []).sort((a, b) => DEMI_ORDER.indexOf(a.demi_journee) - DEMI_ORDER.indexOf(b.demi_journee));
    // Build rows: for each default demi-journée, either the signature or a placeholder
    const demisForDay = existingSigs.length > 0
      ? Array.from(new Set([...defaultDemis, ...existingSigs.map(s => s.demi_journee)]))
          .sort((a, b) => DEMI_ORDER.indexOf(a) - DEMI_ORDER.indexOf(b))
      : defaultDemis;

    for (let i = 0; i < demisForDay.length; i++) {
      const demi = demisForDay[i];
      const sig = existingSigs.find(s => s.demi_journee === demi);
      // Page break
      if (y + rowH > ph - 20) {
        doc.addPage();
        y = 20;
      }
      // Row border
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.rect(margin, y, pw - margin * 2, rowH);
      doc.line(margin + dateColW, y, margin + dateColW, y + rowH);
      doc.line(margin + dateColW + demiColW, y, margin + dateColW + demiColW, y + rowH);

      // Date (only on first row of day)
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      if (i === 0) {
        doc.setFont('helvetica', 'bold');
        const dayLabel = format(parseISO(date), 'EEEE', { locale: fr });
        const dateStr = format(parseISO(date), 'dd/MM/yyyy');
        doc.text(dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1), margin + 2, y + 8);
        doc.setFont('helvetica', 'normal');
        doc.text(dateStr, margin + 2, y + 14);
      }
      // Demi-journée
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      doc.text(DEMI_LABELS[demi] || demi, margin + dateColW + 2, y + 8);
      if (sig) {
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        try {
          doc.text(`Signé le ${format(new Date(sig.signed_at), 'dd/MM HH:mm', { locale: fr })}`, margin + dateColW + 2, y + 14);
        } catch {}
        // Mention de confirmation (uniquement si le stagiaire a bien coché les cases)
        if (sig.confirme_presence_lieu && sig.confirme_identite) {
          doc.setFontSize(6.5);
          doc.setTextColor(20, 120, 60);
          doc.text(
            `\u2611 A confirme sa presence sur place et son identite`,
            margin + dateColW + 2, y + 20, { maxWidth: demiColW - 4 },
          );
        } else if (sig.confirme_presence_lieu) {
          doc.setFontSize(6.5);
          doc.setTextColor(20, 120, 60);
          doc.text(`\u2611 A confirme sa presence sur place`, margin + dateColW + 2, y + 20, { maxWidth: demiColW - 4 });
        } else if (sig.confirme_identite) {
          doc.setFontSize(6.5);
          doc.setTextColor(20, 120, 60);
          doc.text(`\u2611 A confirme son identite`, margin + dateColW + 2, y + 20, { maxWidth: demiColW - 4 });
        }
      }

      // Signature image
      if (sig && sig.signature && sig.signature.startsWith('data:image')) {
        try {
          const sigH = rowH - 6;
          const sigW = Math.min(sigColW - 6, 60);
          doc.addImage(
            sig.signature,
            'PNG',
            margin + dateColW + demiColW + (sigColW - sigW) / 2,
            y + 3,
            sigW,
            sigH,
          );
        } catch {}
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(170, 170, 170);
        doc.text('(Non signé)', margin + dateColW + demiColW + 4, y + rowH / 2);
      }

      y += rowH;
    }
  }


  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${COMPANY.name} - ${COMPANY.address} | Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
      pw / 2, ph - 8, { align: 'center' }
    );
    doc.text(`Page ${i}/${totalPages}`, pw - margin, ph - 8, { align: 'right' });
  }

  const fileName = `emargement-semaine_${apprenant.nom}_${apprenant.prenom}_${weekStart}.pdf`
    .replace(/\s+/g, '-').toLowerCase();
  if (opts?.returnBlob) {
    return { blob: doc.output('blob'), fileName };
  }
  doc.save(fileName);
}
