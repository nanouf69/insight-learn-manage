import jsPDF from 'jspdf';
import { nomSousSignature } from './identite-signature-apprenant';
import logoImage from '@/assets/logo-ftransport.png?inline';
import type { SignatureRassemblee } from '@/lib/signaturesRassemblees';

const NAVY: [number, number, number] = [13, 37, 64];
const BLUE: [number, number, number] = [41, 128, 185];
const PALE: [number, number, number] = [232, 244, 251];
const BORDER: [number, number, number] = [181, 214, 232];
const TEXT: [number, number, number] = [31, 48, 64];
const MUTED: [number, number, number] = [82, 105, 122];

export function dateSignatureParis(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Date de signature non renseignée';
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
const fmtJourSemaine = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long' });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function dateSignatureAvecJour(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return dateSignatureParis(value);
  return `${cap(fmtJourSemaine.format(new Date(value)))} ${dateSignatureParis(value)}`;
}
const datePresence = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : 'Date non renseignée';
export const datePresenceAvecJour = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${cap(fmtJourSemaine.format(new Date(`${value}T12:00:00Z`)))} ${datePresence(value)}` : datePresence(value);

/** Read-only export: original learner images only, never a shared/fallback signature. */
export function generateSignaturesRassembleesPdf(apprenant: { nom?: string; prenom?: string }, rows: SignatureRassemblee[]) {
  if (!rows.length) throw new Error('Aucune signature enregistrée à exporter');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const width = pageWidth - margin * 2;
  const rowHeight = 46;
  const rowGap = 3;
  const bodyBottom = 274;
  const name = `${apprenant.prenom ?? ''} ${apprenant.nom ?? ''}`.trim() || 'Non renseigné';
  const formateurs = [...new Set(rows.map(row => row.formateur?.trim() || 'Non renseigné'))];
  const formateursLabel = formateurs.join(' · ');
  const exportDate = dateSignatureParis(new Date().toISOString());
  let y = 0;

  const header = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageWidth, 5, 'F');
    try { doc.addImage(logoImage, 'PNG', margin, 11, 43, 13.4); } catch { /* optional branding only */ }
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.45);
    doc.line(64, 10, 64, 27);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14.5);
    doc.setTextColor(...NAVY);
    doc.text('Signatures d’émargement rassemblées', pageWidth - margin, 16, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BLUE);
    doc.text('Relevé des présences · copies des signatures originales', pageWidth - margin, 23, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    const learnerLines = doc.splitTextToSize(name, 78);
    doc.setFontSize(8.5);
    const trainerLines = doc.splitTextToSize(formateursLabel, 72);
    const identityHeight = 13 + Math.max(learnerLines.length, trainerLines.length) * 4.2;
    const identityY = 32;
    doc.setFillColor(...PALE);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.35);
    doc.roundedRect(margin, identityY, width, identityHeight, 2, 2, 'FD');
    doc.line(105, identityY + 4, 105, identityY + identityHeight - 4);

    doc.setFontSize(6.8);
    doc.setTextColor(...BLUE);
    doc.text('APPRENANT', margin + 4, identityY + 6);
    doc.text('FORMATEUR(S)', 110, identityY + 6);
    doc.setTextColor(...NAVY);
    doc.setFontSize(10.5);
    doc.text(learnerLines, margin + 4, identityY + 12, { lineHeightFactor: 1.12 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    doc.text(trainerLines, 110, identityY + 12, { lineHeightFactor: 1.12 });

    y = identityY + identityHeight + 6;
    doc.setFontSize(7.2);
    doc.setTextColor(...MUTED);
    doc.text(`${rows.length} signature${rows.length > 1 ? 's' : ''} enregistrée${rows.length > 1 ? 's' : ''} · théorie et pratique · horodatage Europe/Paris`, margin, y);
    y += 4;
    doc.text('Les versions distinctes sont conservées, sans cumul d’heures. Aucune signature de formateur n’est ajoutée.', margin, y);
    y += 6;
  };

  header();
  for (const row of rows) {
    if (y + rowHeight > bodyBottom) { doc.addPage(); header(); }
    const rightX = margin + 119;
    const rightWidth = width - 119;

    doc.setFillColor(250, 253, 255);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.35);
    doc.roundedRect(margin, y, width, rowHeight, 2, 2, 'FD');
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, width, 10, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(255, 255, 255);
    doc.text(datePresenceAvecJour(row.date), margin + 3, y + 6.6);
    const slotLabel = row.creneau.toUpperCase();
    const slotWidth = Math.max(27, Math.min(43, doc.getTextWidth(slotLabel) + 8));
    doc.setFillColor(...PALE);
    doc.roundedRect(margin + width - slotWidth - 2, y + 2, slotWidth, 6, 1.5, 1.5, 'F');
    doc.setFontSize(6.8);
    doc.setTextColor(...NAVY);
    doc.text(slotLabel, margin + width - slotWidth / 2 - 2, y + 6.2, { align: 'center' });

    doc.setDrawColor(...BORDER);
    doc.line(rightX, y + 10, rightX, y + rowHeight);
    const leftX = margin + 3;
    const leftWidth = 112;
    doc.setTextColor(...TEXT);
    doc.setFontSize(8.4);
    doc.text(doc.splitTextToSize(`${row.activite}${row.absent ? ' — absence déclarée' : ''}`, leftWidth), leftX, y + 15.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text(doc.splitTextToSize(`Formateur : ${row.formateur || 'Non renseigné'}`, leftWidth), leftX, y + 20.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(doc.splitTextToSize(`Horaires de formation : ${row.horaires}`, leftWidth), leftX, y + 25.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(row.sourceHoraires, leftWidth), leftX, y + 30, { lineHeightFactor: 1.1 });
    doc.setFontSize(7);
    doc.setTextColor(...TEXT);
    doc.text(`Signé le : ${dateSignatureAvecJour(row.signedAt)}`, leftX, y + 38);
    doc.setFontSize(6.2);
    doc.setTextColor(...MUTED);
    doc.text(`Référence : ${row.id}`, leftX, y + 43);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(rightX + 3, y + 13, rightWidth - 6, 21, 1, 1, 'FD');
    try {
      const props = doc.getImageProperties(row.signature);
      const scale = Math.min((rightWidth - 10) / props.width, 17 / props.height);
      const imageWidth = props.width * scale;
      const imageHeight = props.height * scale;
      doc.addImage(row.signature, props.fileType, rightX + 3 + (rightWidth - 6 - imageWidth) / 2, y + 13 + (21 - imageHeight) / 2, imageWidth, imageHeight);
    } catch {
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(['Signature enregistrée', 'mais image illisible'], rightX + rightWidth / 2, y + 22, { align: 'center' });
    }
    nomSousSignature(doc, apprenant, rightX, y + 34, rightWidth, 10);
    y += rowHeight + rowGap;
  }

  const pages = doc.getNumberOfPages();
  for (let n = 1; n <= pages; n++) {
    doc.setPage(n);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 17, pageWidth - margin, pageHeight - 17);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...NAVY);
    doc.text('FTRANSPORT · 86 route de Genas, 69003 Lyon · contact@ftransport.fr', margin, pageHeight - 12);
    doc.text(`Page ${n} / ${pages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(`Export du ${exportDate} · Europe/Paris`, margin, pageHeight - 7);
    doc.text('Signatures originales conservées', pageWidth - margin, pageHeight - 7, { align: 'right' });
  }
  doc.setProperties({ title: `Signatures d’émargement rassemblées — ${name}`, subject: 'Copies des signatures originales de l’apprenant' });
  return { blob: doc.output('blob'), fileName: `signatures-emargement_${name.replace(/[^\p{L}\p{N}-]+/gu, '-')}.pdf`, pages };
}
