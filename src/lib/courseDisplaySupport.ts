import gestionOriginal from "@/assets/cours-vtc/GESTION_2SUR3_v9-2.pptx.asset.json";
import gestionCorrected from "@/assets/cours-vtc/GESTION_2SUR3_cadrage_20261013.pptx.asset.json";
import gestionPdf from "@/assets/cours-vtc/GESTION_2SUR3_cadrage_20261013.pdf.asset.json";
import { t3pPartie2DisplaySupport } from "./t3pPartie2Support";

/** Display-only substitution of exact versioned media; never changes saved course data. */
export function courseDisplaySupport(url: string): { url: string; pdfUrl?: string } {
  const path = url.split(/[?#]/)[0];
  if (path === gestionOriginal.url || path === gestionCorrected.url) {
    return { url: gestionCorrected.url, pdfUrl: gestionPdf.url };
  }
  return t3pPartie2DisplaySupport(url);
}