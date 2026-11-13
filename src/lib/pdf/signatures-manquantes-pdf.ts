import jsPDF from 'jspdf';
import logoImage from '@/assets/logo-ftransport.png';
import type { SignatureManquante } from '@/lib/signaturesManquantes';
import { datePresenceAvecJour } from '@/lib/pdf/signatures-rassemblees';
import { minutesHorairePresence, formatMinutesPresence } from '@/lib/heuresRestantSigner';

/** Formateur indiqué sur la feuille, à la demande explicite du propriétaire (aucune donnée formateur n'existe sur les sessions). */
export const FORMATEUR_EMARGEMENT = 'Guenichi Naoufal';

export interface LigneSignaturesManquantes {
  date: string;
  creneau: string;
  horaires?: string;
  absence: boolean;
  minutes: number | null;
}

/** Lignes triées prêtes pour le PDF (fonction pure, testable). */
export function lignesPdfSignaturesManquantes(rows: SignatureManquante[]): LigneSignaturesManquantes[] {
  const uniques = new Map<string, SignatureManquante>();
  for (const r of rows) {
    const key = `${r.date}|${r.creneau}`;
    const previous = uniques.get(key);
    if(previous && (previous.horaires !== r.horaires || previous.etat !== r.etat)) throw new Error('Créneau contradictoire : revue avant impression');
    uniques.set(key,r);
  }
  const sorted = [...uniques.values()].sort((a, b) => a.date.localeCompare(b.date) || a.creneau.localeCompare(b.creneau));
  return sorted.map(r => ({
    date: datePresenceAvecJour(r.date),
    creneau: r.creneau,
    horaires: String(r.horaires ?? '').trim() || undefined,
    absence: r.etat === 'absence_enregistree',
    minutes: minutesHorairePresence(r.horaires),
  }));
}

/** Union of recorded wall-clock ranges per Paris training date; no duration fixed by track. */
export function totalPdfSignaturesManquantes(rows: SignatureManquante[]) {
  const lignes=lignesPdfSignaturesManquantes(rows);
  const ranges=new Map<string,Array<[number,number]>>();
  for(const l of lignes.filter(l=>!l.absence)) {
    if(l.minutes==null)return {minutes:null,creneaux:lignes.filter(l=>!l.absence).length};
    const h=/^(\d{1,2})[h:](\d{2})?/.exec(l.horaires??'');
    if(!h)return {minutes:null,creneaux:lignes.filter(l=>!l.absence).length};
    const start=Number(h[1])*60+Number(h[2]??0);
    ranges.set(l.date,[...(ranges.get(l.date)??[]),[start,start+l.minutes]]);
  }
  let minutes=0;
  for(const day of ranges.values()) {
    day.sort((a,b)=>a[0]-b[0]);let end=-1;
    for(const [a,b] of day){minutes+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}
  }
  return {minutes,creneaux:lignes.filter(l=>!l.absence).length};
}

/** Feuille vierge à imprimer : une case vide par créneau passé non signé. Lecture seule, rien n'est enregistré. */
export function generateSignaturesManquantesPdf(apprenant: { nom?: string; prenom?: string }, rows: SignatureManquante[]) {
  if (!rows.length) throw new Error('Aucune signature manquante');
  const lignes = lignesPdfSignaturesManquantes(rows);
  const total=totalPdfSignaturesManquantes(rows);
  const totalTexte=`Total des heures restant à signer : ${total.minutes==null?'à vérifier (horaires manquants)':formatMinutesPresence(total.minutes)} (${total.creneaux} créneaux)`;
  const doc = new jsPDF({format:'a4',orientation:'portrait',unit:'mm'});
  const m = 14, w = 182, rowH = 30;
  const colDate = 35, colCreneau = 37, colDuree=25, colFormateur = 32;
  const xCreneau = m + colDate, xDuree=xCreneau+colCreneau, xFormateur = xDuree+colDuree, xSignature = xFormateur + colFormateur;
  const name = `${apprenant.prenom ?? ''} ${apprenant.nom ?? ''}`.trim();
  let y = 0;
  const header = () => {
    try { doc.addImage(logoImage, 'PNG', m, 10, 38, 13); } catch { /* optional */ }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(13, 37, 64);
    doc.text('Feuille d’émargement — signatures manquantes', m, 33);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
    doc.text(`Apprenant : ${name}`, m, 41);
    doc.text(`Formateur : ${FORMATEUR_EMARGEMENT}`, m + 70, 41);
    doc.setFontSize(9);doc.setFont('helvetica','bold');doc.text(totalTexte,m,48);
    doc.setFont('helvetica','normal');doc.setFontSize(8);
    doc.text('Feuille à signer : ne certifie pas une présence acquise. Aucune signature antidatée.', m, 54);
    y = 61;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.rect(m, y, w, 12);
    doc.text('Date', m + 2, y + 7); doc.text('Créneau / horaire', xCreneau + 2, y + 7);
    doc.text(['Durée / heures','à signer'],xDuree+2,y+5);
    doc.text('Formateur', xFormateur + 2, y + 7); doc.text(['Signature de','l’apprenant'], xSignature + 2, y + 5);
    doc.setFont('helvetica', 'normal');
    y += 12;
  };
  header();
  for (const l of lignes) {
    if (y + rowH > 277) { doc.addPage(); header(); }
    doc.rect(m, y, colDate, rowH); doc.rect(xCreneau, y, colCreneau, rowH); doc.rect(xDuree,y,colDuree,rowH);doc.rect(xFormateur, y, colFormateur, rowH); doc.rect(xSignature, y, w - colDate - colCreneau - colDuree - colFormateur, rowH);
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(l.date,colDate-4), m + 2, y + 7);
    doc.text(doc.splitTextToSize(l.creneau,colCreneau-4), xCreneau + 2, y + 7);
    doc.setFontSize(7);
    if (l.horaires) doc.text(l.horaires, xCreneau + 2, y + 18);
    if (l.absence) doc.text('(absence enregistrée)', xCreneau + 2, y + 24);
    doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(l.absence?'Hors total':l.minutes==null?'À vérifier':formatMinutesPresence(l.minutes),xDuree+2,y+10);doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(FORMATEUR_EMARGEMENT,colFormateur-4), xFormateur + 2, y + 7);
    y += rowH;
  }
  const pages = doc.getNumberOfPages();
  for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFontSize(8);doc.text(totalTexte,m,284);doc.text(`${p}/${pages}`,196,290,{align:'right'});}
  return { blob: doc.output('blob'), fileName: `signatures-manquantes-${name.replace(/\s+/g, '-') || 'apprenant'}.pdf`, pages, totalMinutes:total.minutes, creneaux:total.creneaux };
}
