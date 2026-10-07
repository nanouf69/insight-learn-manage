import pptxAsset from "@/assets/cours-vtc/A_T3P_partie_2_integrale_20261007.pptx.asset.json";
import pdfAsset from "@/assets/cours-vtc/A_T3P_partie_2_integrale_20261007.pdf.asset.json";

export const T3P_PARTIE2_PPTX_URL = pptxAsset.url;
export const T3P_PARTIE2_PDF_URL = pdfAsset.url;

/** Exact historical support only; admin uploads and other subjects are never replaced. */
export function t3pPartie2DisplaySupport(url: string): { url: string; pdfUrl?: string } {
  const path = url.split(/[?#]/)[0];
  if (path === "/cours/vtc/A_T3P_partie_2.pptx" || path === T3P_PARTIE2_PPTX_URL) {
    return { url: T3P_PARTIE2_PPTX_URL, pdfUrl: T3P_PARTIE2_PDF_URL };
  }
  if (path === "/cours/vtc/A_T3P_2.pdf") return { url: T3P_PARTIE2_PDF_URL };
  return { url };
}