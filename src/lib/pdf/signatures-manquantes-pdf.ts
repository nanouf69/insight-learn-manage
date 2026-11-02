import jsPDF from 'jspdf';
import logoImage from '@/assets/logo-ftransport.png';
import type { SignatureManquante } from '@/lib/signaturesManquantes';
import { datePresenceAvecJour } from '@/lib/pdf/signatures-rassemblees';

const LABELS: Record<string, string> = {
  matin: 'Matin (9h-12h)', apres_midi: 'Après-midi (13h-16h)', soir: 'Soir',
  soir_1: 'Soir 1 (17h-18h30)', soir_2: 'Soir 2 (18h30-21h)',
};

/** Feuille vierge à imprimer : une case vide par créneau passé non signé. Lecture seule, rien n'est enregistré. */
export function generateSignaturesManquantesPdf(apprenant: { nom?: string; prenom?: string }, rows: SignatureManquante[]) {
  if (!rows.length) throw new Error('Aucune signature manquante');
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.creneau.localeCompare(b.creneau));
  const doc = new jsPDF();
  const m = 14, w = 182, rowH = 26;
  const name = `${apprenant.prenom ?? ''} ${apprenant.nom ?? ''}`.trim();
  let y = 0;
  const header = () => {
    try { doc.addImage(logoImage, 'PNG', m, 10, 38, 13); } catch { /* optional */ }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(13, 37, 64);
    doc.text('Feuille d’émargement — signatures manquantes', m, 33);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
    doc.text(`Apprenant : ${name}`, m, 41);
    doc.setFontSize(8);
    doc.text(`${sorted.length} créneau(x) passé(s) sans signature enregistrée. À signer à la main par l’apprenant.`, m, 47);
    y = 54;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.rect(m, y, w, 8); doc.text('Date', m + 2, y + 5.5); doc.text('Créneau', m + 62, y + 5.5); doc.text('Signature de l’apprenant', m + 112, y + 5.5);
    doc.setFont('helvetica', 'normal');
    y += 8;
  };
  header();
  for (const r of sorted) {
    if (y + rowH > 285) { doc.addPage(); header(); }
    doc.rect(m, y, 60, rowH); doc.rect(m + 60, y, 50, rowH); doc.rect(m + 110, y, w - 110, rowH);
    doc.setFontSize(9);
    doc.text(datePresenceAvecJour(r.date), m + 2, y + 7);
    doc.text(LABELS[r.creneau] ?? r.creneau, m + 62, y + 7);
    if (r.etat === 'absence_enregistree') { doc.setFontSize(7); doc.text('(absence enregistrée)', m + 62, y + 12); }
    y += rowH;
  }
  const pages = doc.getNumberOfPages();
  return { blob: doc.output('blob'), fileName: `signatures-manquantes-${name.replace(/\s+/g, '-') || 'apprenant'}.pdf`, pages };
}
