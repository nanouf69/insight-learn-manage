import { pdfjs } from "react-pdf";
import { ensurePdfWorker } from "@/lib/pdfWorker";
import { lignesDepuisItems } from "@/lib/cmaPlanningImport";

/** Extraction locale (navigateur, sans IA) du texte d'un PDF, page par page. */
export async function extraireLignesPdf(file: File): Promise<Array<{ segments: string[]; page: number }>> {
  ensurePdfWorker();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: Array<{ segments: string[]; page: number }> = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Coordonnées écran (gère les pages pivotées) : y écran inversé pour garder « haut = grand y ».
    const vt = page.getViewport({ scale: 1 }).transform;
    const items = (content.items as Array<{ str?: string; transform?: number[]; width?: number }>)
      .filter((i) => typeof i.str === "string" && i.transform)
      .map((i) => {
        const t = pdfjs.Util.transform(vt, i.transform!);
        return { str: i.str as string, x: t[4], y: -t[5], width: i.width ?? 0 };
      });
    out.push(...lignesDepuisItems(items, p));
  }
  return out;
}
