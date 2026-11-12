/** Évalue un tracé de signature à partir des pixels (alpha) du canvas. */
export interface QualiteSignature { ok: boolean; raison?: string }

export function evaluerPixelsSignature(alpha: (x: number, y: number) => number, width: number, height: number): QualiteSignature {
  let minX = width, minY = height, maxX = -1, maxY = -1, encre = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (alpha(x, y) > 40) {
        encre++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (encre === 0) return { ok: false, raison: "Aucune signature détectée." };
  const largeur = (maxX - minX) / width;
  const hauteur = (maxY - minY) / height;
  if (largeur < 0.15 || hauteur < 0.12 || encre < 60) {
    return { ok: false, raison: "Signature trop petite ou incomplète : merci de la refaire en signant normalement dans le cadre." };
  }
  return { ok: true };
}

export function evaluerSignatureDataUrl(dataUrl: string): Promise<QualiteSignature> {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve({ ok: false, raison: "Aucune signature détectée." });
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d");
      if (!ctx || !c.width || !c.height) return resolve({ ok: true });
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      resolve(evaluerPixelsSignature((x, y) => d[(y * c.width + x) * 4 + 3], c.width, c.height));
    };
    img.onerror = () => resolve({ ok: true });
    img.src = dataUrl;
  });
}
