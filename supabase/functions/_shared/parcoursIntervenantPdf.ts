import { PDFDocument, StandardFonts, rgb, degrees } from "npm:pdf-lib@1.17.1";
import type { PDFFont, PDFPage } from "npm:pdf-lib@1.17.1";

export interface SectionPdfIntervenant { titre: string; lignes: string[] }
export interface EntreePdfIntervenant {
  titre: string;
  destinataire: string;
  sections: SectionPdfIntervenant[];
  empreinteSource: string;
  operationId?: string;
  apercu: boolean;
  signature?: { dataUrl: string; signeLeParis: string; consentement: string; signataire?: string };
  noteFin?: string;
}

const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
function textePdf(value: unknown) {
  return String(value ?? "")
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/\r\n?/g, "\n")
    .split("")
    .map(char => {
      const point = char.codePointAt(0)!;
      return char === "\n" || char === "\t" || (point >= 32 && point <= 255) || WIN_ANSI_EXTRA.includes(char) ? char : "?";
    }).join("");
}

function lignesAdaptees(texte: string, font: PDFFont, taille: number, largeur: number) {
  const sortie: string[] = [];
  for (const paragraphe of textePdf(texte).split("\n")) {
    let ligne = "";
    for (const mot of paragraphe.split(/\s+/).filter(Boolean)) {
      const essai = ligne ? `${ligne} ${mot}` : mot;
      if (font.widthOfTextAtSize(essai, taille) > largeur && ligne) { sortie.push(ligne); ligne = mot; }
      else ligne = essai;
    }
    sortie.push(ligne);
  }
  return sortie;
}

/** PDF d'aperçu ou preuve signée. Le contenu signé est toujours issu du document figé relu côté serveur. */
export async function genererPdfIntervenant(entree: EntreePdfIntervenant): Promise<Uint8Array> {
  if (!entree.apercu && !entree.signature?.dataUrl) throw new Error("Signature réelle requise pour un PDF final");
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);
  const signature = entree.signature ? await pdf.embedPng(entree.signature.dataUrl) : null;
  const W = 595.28, H = 841.89, marge = 48, largeur = W - 2 * marge;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - marge;
  let numero = 1;

  const pied = (p: PDFPage, n: number) => {
    p.drawLine({ start: { x: marge, y: 35 }, end: { x: W - marge, y: 35 }, thickness: 0.5, color: rgb(0.78, 0.82, 0.85) });
    p.drawText(textePdf(`SERVICES PRO — ${entree.apercu ? "APERÇU NON SIGNÉ" : "Preuve de signature"} — page ${n}`), { x: marge, y: 21, size: 7.5, font: normal, color: rgb(0.35, 0.39, 0.43) });
  };
  const nouvellePage = () => { pied(page, numero++); page = pdf.addPage([W, H]); y = H - marge; };
  const espace = (hauteur: number) => { if (y - hauteur < 50) nouvellePage(); };
  const texte = (value: string, options: { taille?: number; font?: PDFFont; couleur?: ReturnType<typeof rgb>; interligne?: number; retrait?: number } = {}) => {
    const taille = options.taille ?? 10, font = options.font ?? normal, interligne = options.interligne ?? taille * 1.42;
    for (const ligne of lignesAdaptees(value, font, taille, largeur - (options.retrait ?? 0))) {
      espace(interligne + 2);
      page.drawText(ligne, { x: marge + (options.retrait ?? 0), y: y - taille, size: taille, font, color: options.couleur ?? rgb(0.12, 0.15, 0.18) });
      y -= interligne;
    }
  };

  if (entree.apercu) {
    page.drawText("APERÇU NON SIGNÉ", { x: 104, y: H / 2 - 20, size: 42, font: gras, color: rgb(0.91, 0.90, 0.88), rotate: degrees(32) });
  }
  texte("FTRANSPORT — SERVICES PRO", { taille: 10, font: gras, couleur: rgb(0.05, 0.40, 0.62) });
  y -= 8;
  texte(entree.titre, { taille: 16, font: gras });
  texte(entree.destinataire, { taille: 10, font: gras });
  texte(entree.apercu ? "PROJET À VALIDER — AUCUNE SIGNATURE NI DATE CONTRACTUELLE" : "DOCUMENT SIGNÉ ÉLECTRONIQUEMENT", { taille: 9, font: gras, couleur: entree.apercu ? rgb(0.68, 0.30, 0.10) : rgb(0.10, 0.45, 0.25) });
  y -= 8;

  for (const section of entree.sections) {
    y -= 5;
    texte(section.titre, { taille: 11, font: gras });
    for (const ligne of section.lignes) { texte(ligne, { taille: 9.7 }); y -= 3; }
  }

  espace(signature ? 165 : 75);
  y -= 10;
  texte("Traçabilité du document", { taille: 11, font: gras });
  texte(`Empreinte SHA-256 du contenu source : ${entree.empreinteSource}`, { taille: 8 });
  if (entree.operationId) texte(`Opération de signature : ${entree.operationId}`, { taille: 8 });
  if (entree.signature && signature) {
    texte(`Consentement : ${entree.signature.consentement}`, { taille: 8.5 });
    texte(`Signature manuscrite de ${entree.signature.signataire || "Albert AKONO"} — enregistrée par le serveur ${entree.signature.signeLeParis}`, { taille: 9, font: gras });
    const hauteur = 78, largeurSignature = Math.min(230, signature.width * hauteur / signature.height);
    espace(hauteur + 12);
    page.drawRectangle({ x: marge, y: y - hauteur, width: largeurSignature + 12, height: hauteur + 8, borderColor: rgb(0.70, 0.74, 0.78), borderWidth: 0.8 });
    page.drawImage(signature, { x: marge + 6, y: y - hauteur + 4, width: largeurSignature, height: hauteur - 4 });
    y -= hauteur + 18;
  }
  if (entree.noteFin) texte(entree.noteFin, { taille: 8.5 });
  pied(page, numero);
  pdf.setTitle(textePdf(entree.titre));
  pdf.setAuthor("SERVICES PRO");
  pdf.setProducer("SERVICES PRO — parcours intervenant");
  pdf.setSubject(entree.apercu ? "Aperçu non signé" : "Preuve de signature manuscrite horodatée");
  return pdf.save();
}
