/**
 * Analyse d'une signature (data URL PNG) et comparaison avec des signatures de référence.
 * Objectif : détecter si la signature actuelle est manifestement différente des précédentes
 * (gribouillage, forme totalement étrangère) et forcer l'apprenant à re-signer.
 *
 * Les features sont volontairement simples pour rester fiables :
 *  - inkRatio : ratio de pixels encrés (densité)
 *  - aspect   : ratio largeur/hauteur du rectangle englobant l'encre
 *  - cx, cy   : centroïde de l'encre à l'intérieur du rectangle englobant (0..1)
 */

export interface SignatureFeatures {
  inkPixels: number;
  inkRatio: number;
  aspect: number; // width / height (bbox)
  cx: number; // centroïde X normalisé dans la bbox
  cy: number; // centroïde Y normalisé dans la bbox
  bboxRatio: number; // (bbox width * bbox height) / (canvas width * canvas height)
}

const WORK_W = 240;
const WORK_H = 120;
const DARK_THRESHOLD = 200; // 0-255 (moyenne RGB) — en dessous = encré

const loadImage = (dataUrl: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

export async function extractSignatureFeatures(dataUrl: string): Promise<SignatureFeatures | null> {
  if (!dataUrl || typeof document === "undefined") return null;
  try {
    const img = await loadImage(dataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = WORK_W;
    canvas.height = WORK_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WORK_W, WORK_H);
    ctx.drawImage(img, 0, 0, WORK_W, WORK_H);
    const { data } = ctx.getImageData(0, 0, WORK_W, WORK_H);

    let ink = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = WORK_W;
    let minY = WORK_H;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < WORK_H; y++) {
      for (let x = 0; x < WORK_W; x++) {
        const i = (y * WORK_W + x) * 4;
        const alpha = data[i + 3];
        if (alpha < 40) continue;
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (avg < DARK_THRESHOLD) {
          ink++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (ink < 20) {
      return { inkPixels: ink, inkRatio: 0, aspect: 0, cx: 0.5, cy: 0.5, bboxRatio: 0 };
    }

    const bw = Math.max(1, maxX - minX + 1);
    const bh = Math.max(1, maxY - minY + 1);
    const meanX = sumX / ink;
    const meanY = sumY / ink;

    return {
      inkPixels: ink,
      inkRatio: ink / (WORK_W * WORK_H),
      aspect: bw / bh,
      cx: (meanX - minX) / bw,
      cy: (meanY - minY) / bh,
      bboxRatio: (bw * bh) / (WORK_W * WORK_H),
    };
  } catch {
    return null;
  }
}

const median = (arr: number[]) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export interface SignatureCheckResult {
  ok: boolean;
  reason?: string;
  score?: number; // 0 = identique, plus grand = plus différent
}

/**
 * Compare la signature à ses références. Retourne ok=false si :
 *  - la signature est quasi vide (gribouillage minimal), ou
 *  - la forme (ratio d'encre + aspect + centroïde) diffère nettement de la médiane des références.
 * Nécessite au moins 2 références pour être active — sinon toujours ok.
 */
export async function checkSignatureAgainstReferences(
  currentDataUrl: string,
  referenceDataUrls: string[]
): Promise<SignatureCheckResult> {
  const current = await extractSignatureFeatures(currentDataUrl);
  if (!current) return { ok: true };

  // Signature trop pauvre en encre => refuser d'emblée
  if (current.inkPixels < 120) {
    return {
      ok: false,
      reason: "La signature a été mal faite. Merci de re-signer.",
    };
  }

  const refs = (
    await Promise.all(referenceDataUrls.map((u) => extractSignatureFeatures(u)))
  ).filter((f): f is SignatureFeatures => !!f && f.inkPixels >= 120);

  if (refs.length < 2) return { ok: true };

  const medInk = median(refs.map((r) => r.inkRatio));
  const medAspect = median(refs.map((r) => r.aspect));
  const medCx = median(refs.map((r) => r.cx));
  const medCy = median(refs.map((r) => r.cy));

  // Écarts normalisés
  const inkDiff = medInk > 0 ? Math.abs(current.inkRatio - medInk) / medInk : 0;
  const aspectDiff = medAspect > 0 ? Math.abs(current.aspect - medAspect) / medAspect : 0;
  const centroidDiff = Math.hypot(current.cx - medCx, current.cy - medCy);

  // Score composite pondéré
  const score = inkDiff * 1.0 + aspectDiff * 0.8 + centroidDiff * 1.2;

  // Seuils volontairement tolérants (une signature humaine varie naturellement)
  const tooDifferent =
    score > 1.8 || inkDiff > 1.5 || aspectDiff > 1.2 || centroidDiff > 0.35;

  if (tooDifferent) {
    return {
      ok: false,
      score,
      reason:
        "Votre signature est très différente de vos signatures habituelles. Merci de re-signer comme d'habitude.",
    };
  }

  return { ok: true, score };
}
