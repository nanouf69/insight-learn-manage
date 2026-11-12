import jsPDF from "jspdf";
import logoOfficiel from "@/assets/logo-ftransport.png";
import { ORGANISME } from "./modele";
import { attestationFinaleProuvee, jalonsIntegralementProuves, texteCertificationPresentation, type PreuvePresentationAttestation, type SignaturePresentation } from "./presentation";
import { intituleAttestation, type ElementPedagogique } from './redactionPresentation';

export interface AttestationPresentation {
  apprenantId: string; prenom: string; nom: string; formation: string; modalite: string;
  debut: string | null; fin: string | null; sourceFin?: string; dateEmission: string;
  preuve: PreuvePresentationAttestation | null; motifs: string[];
  reference?: string; empreinte?: string | null; empreinteSignee?: string | null;
  centre?: SignaturePresentation | null; apprenant?: SignaturePresentation | null;
  /** Only a server-frozen, authorized double-signature model may request a final export. */
  final?: boolean;
  elementsPedagogiques?: ElementPedagogique[] | null;
  /** Explicitly confirmed applicable approval; never inferred from conflicting templates. */
  agrement?: { filiere: 'VTC' | 'TAXI'; numero: string } | null;
  /** Attestation enregistrée : même mise en page ; signature + tampon du centre apposés SEULEMENT après la signature de l'apprenant. */
  officiel?: { texteCentral: string; signee: boolean; centre: { image: string; tampon: string; le: string | null } | null; apprenant: { image: string; le: string | null } | null } | null;
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
  doc.setTextColor(...bleu);
  texte("FTRANSPORT", 120, 24, 10, true, 70);
  doc.setTextColor(...gris);
  texte("86 Route de Genas · 69003 Lyon\nTél. : 04 28 29 60 91\ncontact@ftransport.fr\nNDA 11770762377", 120, 30, 8.5, false, 70);
  if(e.agrement?.numero.trim()) texte(`Agrément ${e.agrement.filiere} : ${e.agrement.numero}`,120,48,8,false,70);
  doc.setDrawColor(...bleu); doc.setLineWidth(0.35); doc.line(20, 55, 190, 55);
  doc.setTextColor(...bleu); texte("ATTESTATION DE FIN", 20, 65, 21, true); texte("DE FORMATION", 20, 75, 21, true);
  doc.setTextColor(...gris); texte(o ? (o.signee ? "DOCUMENT SIGNÉ PAR LES DEUX PARTIES" : "EN ATTENTE DE LA SIGNATURE DE L'APPRENANT(E)") : finale ? "DOCUMENT VALIDÉ ET SIGNÉ" : "MODÈLE NON VALABLE — NON SIGNÉ", 20, 86, 10, true);
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
  const o = e.officiel ?? null;
  const central = o ? o.texteCentral : texteCertificationPresentation({certifie:complet,prenom:e.prenom,nom:e.nom,formation:intitule,debut:date(e.debut),fin:date(e.fin)});
  const height = texte(central, 20, 165, 11, false, 170);
  if (height > (o ? 58 : 49)) throw new Error("Texte trop long pour le modèle : contrôle de présentation requis");
  if (!finale && !o) {
    // Dedicated strip, away from the body and signature panels, legible in print.
    doc.setTextColor(...filigrane); texte('MODÈLE NON VALABLE',43,226,18,true);
  }
  doc.setDrawColor(...bord); doc.setLineWidth(0.3);
  doc.rect(20, 230, 82, 39); doc.rect(108, 230, 82, 39);
  doc.setTextColor(...bleu); texte("POUR FTRANSPORT", 24, 236, 8.5, true); texte("L'APPRENANT(E)", 112, 236, 8.5, true);
  doc.setTextColor(...gris);
  if (o) {
    if (o.signee && o.centre && o.apprenant) {
      fitImage(o.centre.image, 24, 240, 38, 16); fitImage(o.centre.tampon, 65, 240, 32, 18);
      fitImage(o.apprenant.image, 113, 240, 71, 17);
      if (o.apprenant.le) texte(`Signé le ${o.apprenant.le}`, 112, 265, 7.5);
    } else {
      texte("Signature et tampon apposés\naprès la signature de l'apprenant(e)", 24, 245, 9, false, 74);
      texte("En attente de signature\nélectronique", 112, 245, 9, false, 74);
    }
  } else if (finale && e.centre && e.apprenant) {
    fitImage(e.centre.image, 24, 240, 38, 16); fitImage(e.centre.tampon ?? "", 65, 240, 32, 18);
    fitImage(e.apprenant.image, 113, 240, 71, 17);
    texte(`Signé le ${date(e.centre.le)}`, 24, 265, 7.5); texte(`Signé le ${date(e.apprenant.le)}`, 112, 265, 7.5);
  } else {
    texte("Signature et tampon officiels\nNon apposés — autorisation requise", 24, 245, 9, false, 74);
    texte("Signature électronique\nNon recueillie", 112, 245, 9, false, 74);
  }
  doc.setTextColor(...gris); texte(`Fait à Lyon, le ${date(e.dateEmission)}.`, 20, 278, 8.5);
  // Source timestamps remain in the CRM audit panel, not in the official body.
  texte(`NDA 11770762377 · Réf. ${e.reference ?? `APERÇU-${e.apprenantId.slice(0,8)}`} · Document ${o ? (o.signee ? 'signé' : 'en attente de signature') : finale ? 'validé' : 'préparatoire'}`,20,292,7,false,170);
  return doc.output("blob");
}