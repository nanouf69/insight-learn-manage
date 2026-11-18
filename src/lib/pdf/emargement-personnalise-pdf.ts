import jsPDF from 'jspdf';
import { nomSousSignature } from './identite-signature-apprenant';
import logoImage from '@/assets/logo-ftransport.png';
import { datePresenceAvecJour } from '@/lib/pdf/signatures-rassemblees';
import { FTRANSPORT } from '@/lib/convocationFormation';

export interface CreneauPerso { debut: string; fin: string }
export interface OptionsEmargementPerso {
  dateDebut: string; dateFin: string; joursSemaine: number[]; // 0=dim … 6=sam
  creneaux: CreneauPerso[]; formateur: string; formation: string;
}

const minutes = (h: string) => { const m = /^(\d{1,2}):(\d{2})$/.exec(h.trim()); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };

/** Durée d'un créneau en minutes ; NaN si horaires invalides ou fin ≤ début. */
export function dureeCreneau(c: CreneauPerso): number {
  const d = minutes(c.debut), f = minutes(c.fin);
  return Number.isFinite(d) && Number.isFinite(f) && f > d ? f - d : NaN;
}

export const formatHeures = (min: number) => { const h = Math.floor(min / 60), m = min % 60; return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`; };

/** Dates ISO (YYYY-MM-DD) incluses entre début et fin, filtrées sur les jours choisis. */
export function datesEmargement(debut: string, fin: string, jours: number[]): string[] {
  const out: string[] = [];
  const d = new Date(`${debut}T12:00:00Z`), f = new Date(`${fin}T12:00:00Z`);
  if (isNaN(d.getTime()) || isNaN(f.getTime()) || d > f) return out;
  for (let x = d; x <= f && out.length < 400; x = new Date(x.getTime() + 86400000)) if (jours.includes(x.getUTCDay())) out.push(x.toISOString().slice(0, 10));
  return out;
}

export function calculEmargementPerso(o: OptionsEmargementPerso) {
  const dates = datesEmargement(o.dateDebut, o.dateFin, o.joursSemaine);
  const durees = o.creneaux.map(dureeCreneau);
  if (!o.creneaux.length || durees.some(n => !Number.isFinite(n))) throw new Error('Horaires invalides');
  if (!dates.length) throw new Error('Aucune date');
  const parJour = durees.reduce((a, b) => a + b, 0);
  return { dates, parJour, total: parJour * dates.length };
}

/** Feuille vierge personnalisée à imprimer. Rien n'est enregistré. La signature formateur est l'image admin privée existante. */
export function generateEmargementPersoPdf(apprenant: { nom?: string; prenom?: string }, o: OptionsEmargementPerso, signatureFormateur?: string | null) {
  const { dates, parJour, total } = calculEmargementPerso(o);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setLineHeightFactor(1.25);
  const m = 14, w = 182, rowH = 24, colDate = 40, colH = 34, colF = 54;
  const xH = m + colDate, xF = xH + colH, xS = xF + colF;
  const bleu: [number, number, number] = [13, 37, 64], clair: [number, number, number] = [234, 241, 250];
  const name = `${apprenant.prenom ?? ''} ${apprenant.nom ?? ''}`.trim();
  const lignes = dates.flatMap(d => o.creneaux.map((c, i) => ({ d, c, i })));
  let y = 0;
  const header = (premiere: boolean) => {
    try { doc.addImage(logoImage, 'PNG', m, 8, 36, 12); } catch { /* optional */ }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...bleu);
    doc.text('FEUILLE D’ÉMARGEMENT', m + w, 16, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(FTRANSPORT.raisonSociale, m, 26);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(FTRANSPORT.adresse, m, 31);
    doc.text(`Tél. : ${FTRANSPORT.telephone}   |   ${FTRANSPORT.email}`, m, 36);
    doc.setDrawColor(...bleu); doc.setLineWidth(0.8); doc.line(m, 40, m + w, 40); doc.setLineWidth(0.2);
    y = 45;
    if (premiere) {
      const fields = [
        ['APPRENANT', name], ['FORMATION', o.formation], ['FORMATEUR', o.formateur],
        ['PÉRIODE', `${datePresenceAvecJour(dates[0])} au ${datePresenceAvecJour(dates[dates.length - 1])}`],
      ];
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      const blocks = fields.map(([label, value]) => {
        const lines: string[] = doc.splitTextToSize(value, w - 8);
        return { label, lines, height: 9 + lines.length * 4.5 };
      });
      const infoHeight = blocks.reduce((sum, block) => sum + block.height, 4);
      doc.setFillColor(...clair); doc.roundedRect(m, y, w, infoHeight, 2, 2, 'F');
      let fieldY = y + 6;
      for (const block of blocks) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 90, 90);
        doc.text(block.label, m + 4, fieldY);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...bleu);
        doc.text(block.lines, m + 4, fieldY + 5, { lineHeightFactor: 1.25 });
        fieldY += block.height;
      }
      y += infoHeight + 4;
      doc.setFillColor(...bleu); doc.roundedRect(m, y, w, 9, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(10);
      doc.text(`${formatHeures(parJour)} par jour   •   ${dates.length} jour(s)   •   Total : ${formatHeures(total)}`, m + w / 2, y + 6, { align: 'center' });
      y += 13;
    }
    doc.setFillColor(...bleu); doc.rect(m, y, w, 12, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('Date', m + 2, y + 7); doc.text('Horaires', xH + 2, y + 7);
    doc.text(['Signature', 'du formateur'], xF + 2, y + 4.5);
    doc.text(['Signature', 'de l’apprenant'], xS + 2, y + 4.5);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40); y += 12;
  };
  header(true);
  let k = 0;
  for (const l of lignes) {
    const dayHeight = rowH * o.creneaux.length;
    if (y + rowH > 282 || (l.i === 0 && dayHeight <= 225 && y + dayHeight > 282)) { doc.addPage(); header(false); }
    if (l.i === 0) k++;
    if (k % 2 === 0) { doc.setFillColor(247, 249, 252); doc.rect(m, y, w, rowH, 'F'); }
    doc.setDrawColor(190, 200, 215);
    doc.rect(m, y, colDate, rowH); doc.rect(xH, y, colH, rowH); doc.rect(xF, y, colF, rowH); doc.rect(xS, y, m + w - xS, rowH);
    if (l.i === 0) { doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...bleu); doc.text(doc.splitTextToSize(datePresenceAvecJour(l.d), colDate - 4), m + 2, y + 7); }
    doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40); doc.setFontSize(10);
    doc.text(`${l.c.debut} – ${l.c.fin}`, xH + 2, y + 8);
    doc.setFontSize(7); doc.setTextColor(110, 110, 110); doc.text(formatHeures(dureeCreneau(l.c)), xH + 2, y + 13);
    if (signatureFormateur) { try { doc.addImage(signatureFormateur, 'PNG', xF + 4, y + 3, 40, 11); } catch { /* image illisible : case laissée vide */ } }
    doc.setFontSize(6.5);
    doc.text(doc.splitTextToSize(o.formateur, colF - 4), xF + 2, y + 17, { lineHeightFactor: 1.25 });
    nomSousSignature(doc,apprenant,xS,y+rowH-8,m+w-xS);
    y += rowH;
  }
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...bleu); doc.setLineWidth(0.2); doc.line(m, 284, m + w, 284);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...bleu);
    doc.text(`${FTRANSPORT.raisonSociale} — ${FTRANSPORT.adresse}`, m + w / 2, 287.5, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(`Tél. : ${FTRANSPORT.telephone}   |   ${FTRANSPORT.email}`, m + w / 2, 291, { align: 'center' });
    doc.setFontSize(6.5); doc.setTextColor(110, 110, 110);
    const footerLines: string[] = doc.splitTextToSize(`${name} — page ${p}/${pages}`, w);
    doc.text(footerLines, m + w / 2, 294.5, { align: 'center' });
  }
  return { blob: doc.output('blob'), fileName: `emargement-${name.replace(/\s+/g, '-') || 'apprenant'}-${o.dateDebut}.pdf`, pages };
}
