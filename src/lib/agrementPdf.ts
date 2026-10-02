import { PDFDocument } from "pdf-lib";
import { jsPDF } from "jspdf";

const A4 = { w: 595.28, h: 841.89 };

export const isImage = (n: string) => /\.(jpe?g|png)$/i.test(n);
export const isDocx = (n: string) => /\.docx$/i.test(n);
export const isPdf = (n: string) => /\.pdf$/i.test(n);

/** Image (JPG/PNG) -> PDF A4 une page, image entière. */
export async function imageToPdf(blob: Blob, name: string): Promise<Blob> {
  const doc = await PDFDocument.create();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const img = /\.png$/i.test(name) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  const m = 28;
  const s = Math.min((A4.w - 2 * m) / img.width, (A4.h - 2 * m) / img.height, 1);
  const page = doc.addPage([A4.w, A4.h]);
  page.drawImage(img, { x: (A4.w - img.width * s) / 2, y: (A4.h - img.height * s) / 2, width: img.width * s, height: img.height * s });
  return new Blob([await doc.save()], { type: "application/pdf" });
}

/** Word (.docx) -> HTML (mammoth) -> PDF (jsPDF). */
export async function docxToPdf(blob: Blob): Promise<Blob> {
  const mammoth: any = await import("mammoth");
  const { value } = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;left:-10000px;top:0;width:520px;font-family:Arial,sans-serif;font-size:11px;line-height:1.4;color:#000;background:#fff";
  box.innerHTML = value + "<style>table{border-collapse:collapse}td,th{border:1px solid #999;padding:2px}img{max-width:100%}</style>";
  document.body.appendChild(box);
  try {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    await pdf.html(box, { x: 36, y: 36, width: 520, windowWidth: 520, autoPaging: "text", margin: [36, 36, 36, 36] });
    return pdf.output("blob");
  } finally { box.remove(); }
}

/** Renvoie un PDF pour un fichier source (null si non convertible). */
export async function toPdf(blob: Blob, name: string): Promise<Blob | null> {
  if (isPdf(name)) return blob;
  if (isImage(name)) return imageToPdf(blob, name);
  if (isDocx(name)) return docxToPdf(blob);
  return null;
}

/** Fusionne des PDF dans l'ordre donné. */
export async function mergePdfs(parts: Blob[]): Promise<Blob> {
  const out = await PDFDocument.create();
  for (const p of parts) {
    const src = await PDFDocument.load(await p.arrayBuffer(), { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((pg) => out.addPage(pg));
  }
  return new Blob([await out.save()], { type: "application/pdf" });
}
