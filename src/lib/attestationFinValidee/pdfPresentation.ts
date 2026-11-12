import jsPDF from "jspdf";
import logoOfficiel from "@/assets/logo-ftransport.png";
import { ORGANISME } from "./modele";
import { attestationFinaleProuvee, jalonsIntegralementProuves, type PreuvePresentationAttestation, type SignaturePresentation } from "./presentation";
import { intituleAttestation, motifSansDuree, type ElementPedagogique } from './redactionPresentation';

export interface AttestationPresentation {
  apprenantId: string; prenom: string; nom: string; formation: string; modalite: string;
  debut: string | null; fin: string | null; sourceFin?: string; dateEmission: string;
  preuve: PreuvePresentationAttestation | null; motifs: string[];
  reference?: string; empreinte?: string | null; empreinteSignee?: string | null;
  centre?: SignaturePresentation | null; apprenant?: SignaturePresentation | null;
  /** Only a server-frozen, authorized double-signature model may request a final export. */
  final?: boolean;
  elementsPedagogiques?: ElementPedagogique[] | null;
}
const date = (v: string | null) => v ? new Date(v.length === 10 ? `${v}T12:00:00Z` : v).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" }) : "Non vérifiée";
const image = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error("Logo officiel illisible : export interrompu")); i.src = url;
});
/** New unsent presentation; never used to regenerate an already signed historical document. */
export async function genererPdfPresentation(e: AttestationPresentation): Promise<Blob> {
  const finale = e.final === true && attestationFinaleProuvee({ ...e, centre: e.centre ?? null, apprenant: e.apprenant ?? null,
    empreinte: e.empreinte ?? null, empreinteSignee: e.empreinteSignee ?? null });
  if (e.final && !finale) throw new Error("Attestation finale refusée : preuves ou double signature non confirmées");
  const logo = await image(logoOfficiel);
  const css = getComputedStyle(document.documentElement);
  const couleur = (nom: string): [number, number, number] => {
    const parts = css.getPropertyValue(`--pdf-attestation-${nom}`).trim().split(/\s+/).map(Number);
    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) throw new Error("Couleurs du modèle indisponibles");
    return [parts[0], parts[1], parts[2]];
  };
  const bleu = couleur("bleu"), noir = couleur("texte"), gris = couleur("secondaire"), pale = couleur("fond"), bord = couleur("bord"), filigrane = couleur("filigrane");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({ title: "Attestation de fin de formation — Ftransport", subject: finale ? "Attestation doublement signée" : "Brouillon non valable", author: ORGANISME.raisonSociale });
  const texte = (s: string, x: number, y: number, size = 11, bold = false, width = 170) => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
    const lines = doc.splitTextToSize(s, width) as string[];
    doc.text(lines, x, y, { lineHeightFactor: 1.4 });
    return lines.length * size * 0.3528 * 1.4;
  };
  const fitImage = (src: string | HTMLImageElement, x: number, y: number, w: number, h: number) => {
    const p = doc.getImageProperties(src); const ratio = Math.min(w / p.width, h / p.height);
    doc.addImage(src, "PNG", x + (w - p.width * ratio) / 2, y + (h - p.height * ratio) / 2, p.width * ratio, p.height * ratio);
  };
  fitImage(logo, 20, 15, 88, 28);
  doc.setTextColor(...gris);
  texte("Ftransport\n86 Route de Genas\n69003 Lyon\nNDA 11770762377", 132, 21, 9, false, 58);
  doc.setDrawColor(...bleu); doc.setLineWidth(0.8); doc.line(20, 50, 190, 50);
  doc.setTextColor(...bleu); texte("ATTESTATION DE FIN", 20, 65, 21, true); texte("DE FORMATION", 20, 75, 21, true);
  doc.setTextColor(...gris); texte(finale ? "DOCUMENT VALIDÉ ET SIGNÉ" : "BROUILLON — DOCUMENT NON VALABLE", 20, 86, 10, true);
  doc.setFillColor(...pale); doc.setDrawColor(...bord); doc.roundedRect(20, 95, 170, 59, 2, 2, "FD");
  doc.setTextColor(...gris); texte("APPRENANT(E)", 26, 104, 8, true);
  doc.setTextColor(...noir); texte(`${e.prenom} ${e.nom.toUpperCase()}`, 26, 112, 15, true, 158);
  doc.setTextColor(...gris); texte("FORMATION", 26, 121, 8, true);
  doc.setTextColor(...noir);
  const intitule = intituleAttestation(e.formation,e.modalite);
  const formation = texte(intitule, 26, 128, 10.5, true, 158);
  if (formation > 12) throw new Error("Intitulé trop long pour le modèle : contrôle de présentation requis");
  texte(`Début : ${date(e.debut)}`, 26, 143, 9.5, false, 77);
  texte(`Fin : ${date(e.fin)}`, 110, 143, 9.5, false, 74);
  const complet = jalonsIntegralementProuves(e.preuve, e.apprenantId);
  doc.setTextColor(...noir);
  const central = complet
    ? `Nous attestons que ${e.prenom} ${e.nom.toUpperCase()} a effectué l'ensemble des jalons pédagogiques obligatoires du parcours « ${intitule} ».`
    : "Document préparatoire établi à partir du dossier apprenant. Il ne constitue pas une attestation de formation validée et ne peut être utilisé comme justificatif définitif.";
  const height = texte(central, 20, 164, 10.5, complet, 170);
  if (height > 29) throw new Error("Texte trop long pour le modèle : contrôle de présentation requis");
  doc.setTextColor(...gris);
  let y = 164 + height + 5;
  if (!finale) {
    if(!complet) {
      doc.setTextColor(...bleu);y += texte('Éléments pédagogiques restant à valider',20,y,10,true)+2;
      doc.setTextColor(...noir);
      const lignes = e.elementsPedagogiques?.length
        ? e.elementsPedagogiques.map(p=>`${p.nom} — ${p.statut}`).filter(motifSansDuree)
        : ['Validation pédagogique incomplète — détail à vérifier dans le dossier apprenant'];
      for(const ligne of lignes) {
        const h = (doc.splitTextToSize(ligne,170) as string[]).length * 9 * 0.3528 * 1.4;
        if(y+h>219) throw new Error('Liste pédagogique trop longue : contrôle de présentation requis');
        y+=texte(ligne,20,y,9)+1;
      }
    } else {
      doc.setTextColor(...gris);y+=texte('Validation pédagogique vérifiée. Document en attente des autorisations et signatures requises.',20,y,9)+2;
    }
    const motifs = e.motifs.filter(motifSansDuree).filter(m=>!/jalons|validation complète/i.test(m));
    doc.setTextColor(...gris);
    if(motifs.length && y<211) texte(motifs.join(' · '),20,y+2,8,false,170);
    doc.setTextColor(...filigrane); texte('BROUILLON · NON VALABLE',20,226,8,true);
  }
  doc.setDrawColor(...bord); doc.setLineWidth(0.3);
  doc.rect(20, 230, 82, 39); doc.rect(108, 230, 82, 39);
  doc.setTextColor(...bleu); texte("POUR FTRANSPORT", 24, 236, 8.5, true); texte("L'APPRENANT(E)", 112, 236, 8.5, true);
  doc.setTextColor(...gris);
  if (finale && e.centre && e.apprenant) {
    fitImage(e.centre.image, 24, 240, 38, 16); fitImage(e.centre.tampon ?? "", 65, 240, 32, 18);
    fitImage(e.apprenant.image, 113, 240, 71, 17);
    texte(`Signé le ${date(e.centre.le)}`, 24, 265, 7.5); texte(`Signé le ${date(e.apprenant.le)}`, 112, 265, 7.5);
  } else {
    texte("Signature et tampon officiels\nNon apposés — autorisation requise", 24, 245, 9, false, 74);
    texte("Signature électronique\nNon recueillie", 112, 245, 9, false, 74);
  }
  doc.setTextColor(...gris); texte(`Fait à Lyon, le ${date(e.dateEmission)}.`, 20, 278, 8.5);
  if (e.sourceFin) texte(`Date de fin : ${e.sourceFin}`, 20, 284, 6.5, false, 170);
  texte(`NDA 11770762377 · Réf. ${e.reference ?? `APERÇU-${e.apprenantId.slice(0,8)}`} · Document ${finale ? 'validé' : 'préparatoire'}`,20,292,7,false,170);
  return doc.output("blob");
}