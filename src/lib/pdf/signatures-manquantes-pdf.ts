import jsPDF from 'jspdf';
import logoImage from '@/assets/logo-ftransport.png';
import type { SignatureManquante } from '@/lib/signaturesManquantes';
import { datePresenceAvecJour } from '@/lib/pdf/signatures-rassemblees';

/** Formateur indiqué sur la feuille, à la demande explicite du propriétaire (aucune donnée formateur n'existe sur les sessions). */
export const FORMATEUR_EMARGEMENT = 'Guenichi Naoufal';

export interface LigneSignaturesManquantes {
  date: string;
  creneau: string;
  horaires?: string;
  absence: boolean;
}

/** Lignes triées prêtes pour le PDF (fonction pure, testable). */
export function lignesPdfSignaturesManquantes(rows: SignatureManquante[]): LigneSignaturesManquantes[] {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.creneau.localeCompare(b.creneau));
  return sorted.map(r => ({
    date: datePresenceAvecJour(r.date),
    creneau: r.creneau,
    horaires: String(r.horaires ?? '').trim() || undefined,
    absence: r.etat === 'absence_enregistree',
  }));
}

/** Feuille vierge à imprimer : une case vide par créneau passé non signé. Lecture seule, rien n'est enregistré. */
export function generateSignaturesManquantesPdf(apprenant: { nom?: string; prenom?: string }, rows: SignatureManquante[]) {
  if (!rows.length) throw new Error('Aucune signature manquante');
  const lignes = lignesPdfSignaturesManquantes(rows);
  const doc = new jsPDF();
  const m = 14, w = 182, rowH = 30;
  const colDate = 44, colCreneau = 48, colFormateur = 38;
  const xCreneau = m + colDate, xFormateur = xCreneau + colCreneau, xSignature = xFormateur + colFormateur;
  const name = `${apprenant.prenom ?? ''} ${apprenant.nom ?? ''}`.trim();
  let y = 0;
  const header = () => {
    try { doc.addImage(logoImage, 'PNG', m, 10, 38, 13); } catch { /* optional */ }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(13, 37, 64);
    doc.text('Feuille d’émargement — signatures manquantes', m, 33);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
    doc.text(`Apprenant : ${name}`, m, 41);
    doc.text(`Formateur : ${FORMATEUR_EMARGEMENT}`, m + 70, 41);
    doc.setFontSize(8);
    doc.text(`${lignes.length} créneau(x) passé(s) sans signature enregistrée. À signer à la main par l’apprenant.`, m, 47);
    y = 54;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.rect(m, y, w, 8);
    doc.text('Date', m + 2, y + 5.5); doc.text('Créneau', xCreneau + 2, y + 5.5);
    doc.text('Formateur', xFormateur + 2, y + 5.5); doc.text('Signature de l’apprenant', xSignature + 2, y + 5.5);
    doc.setFont('helvetica', 'normal');
    y += 8;
  };
  header();
  for (const l of lignes) {
    if (y + rowH > 285) { doc.addPage(); header(); }
    doc.rect(m, y, colDate, rowH); doc.rect(xCreneau, y, colCreneau, rowH); doc.rect(xFormateur, y, colFormateur, rowH); doc.rect(xSignature, y, w - colDate - colCreneau - colFormateur, rowH);
    doc.setFontSize(9);
    doc.text(l.date, m + 2, y + 7);
    doc.text(l.creneau, xCreneau + 2, y + 7);
    doc.setFontSize(7);
    if (l.horaires) doc.text(l.horaires, xCreneau + 2, y + 14);
    if (l.absence) doc.text('(absence enregistrée)', xCreneau + 2, l.horaires ? y + 20 : y + 14);
    doc.setFontSize(8);
    doc.text(FORMATEUR_EMARGEMENT, xFormateur + 2, y + 7);
    y += rowH;
  }
  const pages = doc.getNumberOfPages();
  return { blob: doc.output('blob'), fileName: `signatures-manquantes-${name.replace(/\s+/g, '-') || 'apprenant'}.pdf`, pages };
}
