import jsPDF from 'jspdf';
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

/** Feuille vierge personnalisée à imprimer. Rien n'est enregistré. */
export function generateEmargementPersoPdf(apprenant: { nom?: string; prenom?: string }, o: OptionsEmargementPerso) {
  const { dates, parJour, total } = calculEmargementPerso(o);
  const doc = new jsPDF();
  const m = 14, w = 182, rowH = 22, colDate = 46, colH = 40, colF = 40;
  const name = `${apprenant.prenom ?? ''} ${apprenant.nom ?? ''}`.trim();
  const lignes = dates.flatMap(d => o.creneaux.map((c, i) => ({ d, c, i })));
  let y = 0;
  const header = () => {
    try { doc.addImage(logoImage, 'PNG', m, 10, 38, 13); } catch { /* optional */ }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(13, 37, 64);
    doc.text('Feuille d’émargement', m, 32);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
    doc.text(`Apprenant : ${name}`, m, 40);
    doc.text(`Formateur : ${o.formateur}`, m + 95, 40);
    doc.text(`Formation : ${o.formation}`, m, 46);
    doc.text(`Période : du ${datePresenceAvecJour(dates[0])} au ${datePresenceAvecJour(dates[dates.length - 1])}`, m, 52);
    doc.setFont('helvetica', 'bold');
    doc.text(`Heures par jour : ${formatHeures(parJour)} — Total : ${formatHeures(total)} (${dates.length} jour(s))`, m, 58);
    y = 64;
    doc.setFontSize(9); doc.rect(m, y, w, 8);
    doc.text('Date', m + 2, y + 5.5); doc.text('Horaires', m + colDate + 2, y + 5.5);
    doc.text('Formateur', m + colDate + colH + 2, y + 5.5); doc.text('Signature de l’apprenant', m + colDate + colH + colF + 2, y + 5.5);
    doc.setFont('helvetica', 'normal'); y += 8;
  };
  header();
  for (const l of lignes) {
    if (y + rowH > 285) { doc.addPage(); header(); }
    doc.rect(m, y, colDate, rowH); doc.rect(m + colDate, y, colH, rowH); doc.rect(m + colDate + colH, y, colF, rowH); doc.rect(m + colDate + colH + colF, y, w - colDate - colH - colF, rowH);
    doc.setFontSize(9);
    if (l.i === 0) doc.text(datePresenceAvecJour(l.d), m + 2, y + 7);
    doc.text(`${l.c.debut} – ${l.c.fin}`, m + colDate + 2, y + 7);
    doc.setFontSize(7); doc.text(formatHeures(dureeCreneau(l.c)), m + colDate + 2, y + 13);
    doc.setFontSize(8); doc.text(doc.splitTextToSize(o.formateur, colF - 4), m + colDate + colH + 2, y + 7);
    y += rowH;
  }
  return { blob: doc.output('blob'), fileName: `emargement-${name.replace(/\s+/g, '-') || 'apprenant'}-${o.dateDebut}.pdf`, pages: doc.getNumberOfPages() };
}
