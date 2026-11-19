import pptx from "@/assets/cours-vtc/T3P_1SUR2_corrige_3.pptx.asset.json";
import pdf from "@/assets/cours-vtc/T3P_1SUR2_corrige_3.pdf.asset.json";

export const T3P_PARTIE1_PPTX_URL = pptx.url;
export const T3P_PARTIE1_PDF_URL = pdf.url;

/** Replace only identified originals; preserve custom supports and all saved evidence. */
export function t3pPartie1DisplaySupport(url: string): { url: string; pdfUrl?: string } | undefined {
  const path = url.split(/[?#]/)[0];
  if (["/cours/vtc/A_T3P_partie_1.pptx", "/__l5e/assets-v1/9a31a638-dcf4-4ec7-abef-1dd8407fe6bf/T3P_1SUR2_v9.pptx", pptx.url].includes(path)) {
    return { url: pptx.url, pdfUrl: pdf.url };
  }
  if (["/cours/vtc/A_T3P_1.pdf", "/__l5e/assets-v1/7bc48b7b-b396-4f70-adf5-6e5926f9e8f9/T3P_1SUR2_v9.pdf", pdf.url].includes(path)) {
    return { url: pdf.url };
  }
  return undefined;
}