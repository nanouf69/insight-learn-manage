import jsPDF from 'jspdf';
import { nomSousSignature } from './identite-signature-apprenant';
import logoImage from '@/assets/logo-ftransport.png';
import { datePresenceAvecJour } from '@/lib/pdf/signatures-rassemblees';

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
  const doc = new jsPDF();
  const m = 14, w = 182, rowH = 20, colDate = 40, colH = 34, colF = 54;
  const xH = m + colDate, xF = xH + colH, xS = xF + colF;
  const bleu: [number, number, number] = [13, 37, 64], clair: [number, number, number] = [234, 241, 250];
  const name = `${apprenant.prenom ?? ''} ${apprenant.nom ?? ''}`.trim();
  const lignes = dates.flatMap(d => o.creneaux.map((c, i) => ({ d, c, i })));
  let y = 0;
  const header = (premiere: boolean) => {
    try { doc.addImage(logoImage, 'PNG', m, 8, 36, 12); } catch { /* optional */ }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...bleu);
    doc.text('FEUILLE D’ÉMARGEMENT', m + w, 16, { align: 'right' });
    doc.setDrawColor(...bleu); doc.setLineWidth(0.8); doc.line(m, 23, m + w, 23); doc.setLineWidth(0.2);
    y = 28;
    if (premiere) {
      doc.setFillColor(...clair); doc.roundedRect(m, y, w, 30, 2, 2, 'F');
      doc.setFontSize(9); doc.setTextColor(90, 90, 90); doc.setFont('helvetica', 'normal');
      const lab = (t: string, x: number, yy: number) => doc.text(t, x, yy);
      lab('APPRENANT', m + 4, y + 6); lab('FORMATION', m + 96, y + 6); lab('FORMATEUR', m + 4, y + 18); lab('PÉRIODE', m + 96, y + 18);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...bleu);
      let nameSize=11;doc.setFontSize(nameSize);
      while(nameSize>6&&doc.getTextWidth(name)>88){nameSize-=0.5;doc.setFontSize(nameSize);}
      doc.text(name, m + 4, y + 12);doc.setFontSize(11); doc.text(o.formation, m + 96, y + 12); doc.text(o.formateur, m + 4, y + 24);
      doc.setFontSize(10); doc.text(`${datePresenceAvecJour(dates[0])} au ${datePresenceAvecJour(dates[dates.length - 1])}`, m + 96, y + 24);
      y += 34;
      doc.setFillColor(...bleu); doc.roundedRect(m, y, w, 9, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(10);
      doc.text(`${formatHeures(parJour)} par jour   •   ${dates.length} jour(s)   •   Total : ${formatHeures(total)}`, m + w / 2, y + 6, { align: 'center' });
      y += 13;
    }
    doc.setFillColor(...bleu); doc.rect(m, y, w, 8, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('Date', m + 2, y + 5.5); doc.text('Horaires', xH + 2, y + 5.5); doc.text('Signature du formateur', xF + 2, y + 5.5); doc.text('Signature de l’apprenant', xS + 2, y + 5.5);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40); y += 8;
  };
  header(true);
  let k = 0;
  for (const l of lignes) {
    if (y + rowH > 282) { doc.addPage(); header(false); }
    if (l.i === 0) k++;
    if (k % 2 === 0) { doc.setFillColor(247, 249, 252); doc.rect(m, y, w, rowH, 'F'); }
    doc.setDrawColor(190, 200, 215);
    doc.rect(m, y, colDate, rowH); doc.rect(xH, y, colH, rowH); doc.rect(xF, y, colF, rowH); doc.rect(xS, y, m + w - xS, rowH);
    if (l.i === 0) { doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...bleu); doc.text(doc.splitTextToSize(datePresenceAvecJour(l.d), colDate - 4), m + 2, y + 7); }
    doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40); doc.setFontSize(10);
    doc.text(`${l.c.debut} – ${l.c.fin}`, xH + 2, y + 8);
    doc.setFontSize(7); doc.setTextColor(110, 110, 110); doc.text(formatHeures(dureeCreneau(l.c)), xH + 2, y + 13);
    if (signatureFormateur) { try { doc.addImage(signatureFormateur, 'PNG', xF + 4, y + 3, 40, 11); } catch { /* image illisible : case laissée vide */ } }
    doc.setFontSize(6.5); doc.text(o.formateur, xF + 2, y + rowH - 2);
    nomSousSignature(doc,apprenant,xS,y+rowH-8,m+w-xS);
    y += rowH;
  }
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) { doc.setPage(p); doc.setFontSize(7); doc.setTextColor(140, 140, 140); doc.text(`FTRANSPORT — ${name} — page ${p}/${pages}`, m + w / 2, 292, { align: 'center' }); }
  return { blob: doc.output('blob'), fileName: `emargement-${name.replace(/\s+/g, '-') || 'apprenant'}-${o.dateDebut}.pdf`, pages };
}
