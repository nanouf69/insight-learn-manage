import { PDFDocument } from "npm:pdf-lib@1.17.1";

// Signature + tampon FTRANSPORT posés côté serveur uniquement (images privées jamais exposées).
export async function apposerSignatureTampon(supabase: any, bytes: ArrayBuffer): Promise<Uint8Array | null> {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const m = /FT_CADRES:(\[.*\])/.exec(pdf.getKeywords() ?? "");
  if (!m) return null;
  const cadres = JSON.parse(m[1]) as number[][];
  const charger = async (path: string) => {
    const { data, error } = await supabase.storage.from("documents-a-signer").download(path);
    if (error || !data) throw new Error(`image ${path} illisible`);
    return pdf.embedPng(new Uint8Array(await data.arrayBuffer()));
  };
  const signature = await charger("admin-elements/2026-10-26-naoufal-signature.png");
  const tampon = await charger("admin-elements/2026-10-26-naoufal-tampon.png");
  const mm = 72 / 25.4;
  for (const [pageNo, x, y, w, h] of cadres) {
    const page = pdf.getPages()[pageNo - 1];
    if (!page) continue;
    const H = page.getHeight();
    const zoneTop = y + 11, zoneH = h - 13, zoneW = (w - 6) / 2;
    const poser = (img: any, x0: number) => {
      const r = Math.min(zoneW / img.width, zoneH / img.height);
      const iw = img.width * r, ih = img.height * r;
      page.drawImage(img, { x: (x0 + (zoneW - iw) / 2) * mm, y: H - (zoneTop + (zoneH + ih) / 2) * mm, width: iw * mm, height: ih * mm });
    };
    poser(signature, x + 2);
    poser(tampon, x + 4 + zoneW);
  }
  return pdf.save();
}
