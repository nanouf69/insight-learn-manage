import gestionOriginal from "@/assets/cours-vtc/GESTION_2SUR3_v9-2.pptx.asset.json";
import gestionCorrected from "@/assets/cours-vtc/GESTION_2SUR3_cadrage_20261013.pptx.asset.json";
import gestionPdf from "@/assets/cours-vtc/GESTION_2SUR3_cadrage_20261013.pdf.asset.json";
import { t3pPartie2DisplaySupport } from "./t3pPartie2Support";
import reglementationV5 from "@/assets/cours-vtc/Reglementation_VTC_1SUR1_v5_1.pptx.asset.json";
import reglementationV6 from "@/assets/cours-vtc/Reglementation_VTC_1SUR1_v6.pptx.asset.json";
import reglementationV8 from "@/assets/cours-vtc/Reglementation_VTC_1SUR1_v8.pptx.asset.json";

/** Display-only substitution of exact versioned media; never changes saved course data. */
export function courseDisplaySupport(url: string): { url: string; pdfUrl?: string } {
  const path = url.split(/[?#]/)[0];
  if (path === reglementationV5.url || path === reglementationV6.url || path === reglementationV8.url) {
    return { url: reglementationV8.url };
  }
  if (path === gestionOriginal.url || path === gestionCorrected.url) {
    return { url: gestionCorrected.url, pdfUrl: gestionPdf.url };
  }
  return t3pPartie2DisplaySupport(url);
}