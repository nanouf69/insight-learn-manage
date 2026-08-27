import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ChampDocument } from "@/lib/documentsASigner";

/**
 * Génère une version aplatie du PDF avec les réponses saisies
 * (textes, chiffres et signatures) incrustées aux emplacements définis.
 */
export async function genererPdfRempli(
  fileUrl: string,
  champs: ChampDocument[],
  reponses: Record<string, string>,
): Promise<Uint8Array> {
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error("Impossible de récupérer le document original");
  const bytes = await res.arrayBuffer();

  const pdfDoc = await PDFDocument.load(bytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const champ of champs) {
    const valeur = reponses?.[champ.id];
    if (!valeur) continue;

    const page = pages[(champ.page || 1) - 1];
    if (!page) continue;

    const { width, height } = page.getSize();
    const x = (champ.x / 100) * width;
    const w = (champ.w / 100) * width;
    const h = (champ.h / 100) * height;
    // pdf-lib : origine en bas à gauche
    const yBas = height - (champ.y / 100) * height - h;

    if (champ.type === "signature" && valeur.startsWith("data:image")) {
      try {
        const img = valeur.includes("image/jpeg")
          ? await pdfDoc.embedJpg(valeur)
          : await pdfDoc.embedPng(valeur);
        const ratio = Math.min(w / img.width, h / img.height);
        const iw = img.width * ratio;
        const ih = img.height * ratio;
        page.drawImage(img, {
          x: x + (w - iw) / 2,
          y: yBas + (h - ih) / 2,
          width: iw,
          height: ih,
        });
      } catch {
        // signature illisible : on ignore plutôt que de casser le document
      }
      continue;
    }

    const texte = String(valeur);
    let taille = Math.min(14, Math.max(7, h * 0.6));
    while (taille > 6 && font.widthOfTextAtSize(texte, taille) > w - 4) {
      taille -= 0.5;
    }
    page.drawText(texte, {
      x: x + 2,
      y: yBas + (h - taille) / 2 + 1,
      size: taille,
      font,
      color: rgb(0, 0, 0),
    });
  }

  return await pdfDoc.save();
}

export function telechargerPdf(bytes: Uint8Array, nomFichier: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier.endsWith(".pdf") ? nomFichier : `${nomFichier}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
