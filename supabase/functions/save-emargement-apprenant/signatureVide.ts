import { decode } from "npm:fast-png@6";

/** true si l'image ne contient aucun pixel tracé (canvas vierge). Image illisible = refus. */
export function signatureVide(dataUrl: string): boolean {
  const m = /^data:image\/png;base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!m) return true;
  try {
    const bin = Uint8Array.from(atob(m[1].replace(/\s/g, "")), c => c.charCodeAt(0));
    const img = decode(bin);
    const ch = img.channels;
    let encre = 0;
    for (let i = 0; i < img.data.length; i += ch) {
      const visible = ch === 4 ? img.data[i + 3] > 0 : ch === 2 ? img.data[i + 1] > 0 : img.data[i] < 250;
      if (visible && ++encre >= 60) return false;
    }
    return true;
  } catch { return true; }
}
