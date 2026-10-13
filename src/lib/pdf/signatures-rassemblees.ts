import jsPDF from 'jspdf';
import logoImage from '@/assets/logo-ftransport.png';
import type { SignatureRassemblee } from '@/lib/signaturesRassemblees';

export function dateSignatureParis(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Date de signature non renseignée';
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
const datePresence = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : 'Date non renseignée';

/** Read-only export: no shared/fallback signature, no invented attendance or hours. */
export function generateSignaturesRassembleesPdf(apprenant: { nom?: string; prenom?: string }, rows: SignatureRassemblee[]) {
  if (!rows.length) throw new Error('Aucune signature enregistrée à exporter');
  const doc = new jsPDF();
  const margin = 14; const width = 182; const rowHeight = 39;
  const name = `${apprenant.prenom ?? ''} ${apprenant.nom ?? ''}`.trim();
  let y = 0;
  const header = () => {
    try { doc.addImage(logoImage, 'PNG', margin, 10, 38, 13); } catch { /* optional branding only */ }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(13, 37, 64);
    doc.text('Signatures d’émargement rassemblées', margin, 33);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(`Apprenant : ${name}`, width);
    doc.text(lines, margin, 41);
    y = 44 + lines.length * 4;
    doc.setFontSize(8);
    doc.text(`${rows.length} signature(s) enregistrée(s) — théorie et pratique — heures de signature : Europe/Paris`, margin, y);
    y += 6;
    doc.text('Copies des signatures originales. Les versions distinctes sont conservées, sans cumul d’heures.', margin, y);
    y += 8;
  };
  header();
  for (const row of rows) {
    if (y + rowHeight > 277) { doc.addPage(); header(); }
    doc.setDrawColor(200, 207, 216); doc.rect(margin, y, width, rowHeight);
    doc.line(133, y, 133, y + rowHeight);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text(`${datePresence(row.date)} — ${row.creneau}`, margin + 3, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(`${row.activite}${row.absent ? ' — absence déclarée' : ''}`, margin + 3, y + 12);
    doc.text(doc.splitTextToSize(`Horaires de formation : ${row.horaires}`, 112), margin + 3, y + 18);
    doc.setFontSize(6.5);
    doc.text(doc.splitTextToSize(row.sourceHoraires, 112), margin + 3, y + 25);
    doc.text(`Signé le : ${dateSignatureParis(row.signedAt)}`, margin + 3, y + 31);
    doc.text(`Référence : ${row.id}`, margin + 3, y + 36);
    try {
      const props = doc.getImageProperties(row.signature);
      const scale = Math.min(53 / props.width, 26 / props.height);
      doc.addImage(row.signature, props.fileType, 138 + (53 - props.width * scale) / 2, y + 6 + (26 - props.height * scale) / 2, props.width * scale, props.height * scale);
    } catch {
      doc.setFontSize(8); doc.text(['Signature enregistrée', 'mais image illisible'], 138, y + 17);
    }
    y += rowHeight;
  }
  const pages = doc.getNumberOfPages();
  for (let n = 1; n <= pages; n++) {
    doc.setPage(n); doc.setFontSize(7); doc.setTextColor(100, 100, 100);
    doc.text(`Ftransport — Export du ${dateSignatureParis(new Date().toISOString())}`, margin, 288);
    doc.text(`Page ${n}/${pages}`, 196, 288, { align: 'right' });
  }
  return { blob: doc.output('blob'), fileName: `signatures-emargement_${name.replace(/[^\p{L}\p{N}-]+/gu, '-')}.pdf`, pages };
}