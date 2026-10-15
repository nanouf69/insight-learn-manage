/**
 * Validation serveur d'une signature manuscrite PNG (data URL).
 * Vérifie : préfixe, base64 strict, taille décodée bornée, en-tête PNG, IHDR plausible,
 * IDAT décompressable et présence de tracé (pas une image vide).
 */
export const MAX_SIGNATURE_OCTETS = 400_000;

export type ResultatSignature = { ok: true; largeur: number; hauteur: number } | { ok: false; raison: string };

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function b64(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s) || s.length % 4 !== 0) return null;
  try {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch { return null; }
}

const u32 = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

async function inflate(data: Uint8Array): Promise<Uint8Array | null> {
  try {
    const src = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(data); c.close(); } });
    const reader = src.pipeThrough(new DecompressionStream("deflate") as any).getReader();
    const parts: Uint8Array[] = [];
    let n = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const v = value as Uint8Array;
      n += v.length;
      if (n > 30_000_000) return null; // bombe de décompression
      parts.push(v);
    }
    const out = new Uint8Array(n);
    let k = 0; for (const p of parts) { out.set(p, k); k += p.length; }
    return out;
  } catch { return null; }
}

export async function validerSignaturePng(dataUrl: unknown): Promise<ResultatSignature> {
  const prefixe = "data:image/png;base64,";
  if (typeof dataUrl !== "string" || !dataUrl.startsWith(prefixe)) return { ok: false, raison: "format" };
  if (dataUrl.length > Math.ceil(MAX_SIGNATURE_OCTETS * 4 / 3) + prefixe.length + 4) return { ok: false, raison: "taille" };
  const bytes = b64(dataUrl.slice(prefixe.length));
  if (!bytes) return { ok: false, raison: "base64" };
  if (bytes.length < 60 || bytes.length > MAX_SIGNATURE_OCTETS) return { ok: false, raison: "taille" };
  for (let i = 0; i < 8; i++) if (bytes[i] !== PNG_SIG[i]) return { ok: false, raison: "entete" };
  // IHDR obligatoire en premier
  if (u32(bytes, 8) !== 13 || String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") return { ok: false, raison: "ihdr" };
  const largeur = u32(bytes, 16), hauteur = u32(bytes, 20);
  const profondeur = bytes[24], couleur = bytes[25], entrelace = bytes[28];
  if (largeur < 50 || hauteur < 30 || largeur > 3000 || hauteur > 2000) return { ok: false, raison: "dimensions" };
  if (profondeur !== 8 || ![2, 6].includes(couleur) || entrelace !== 0) return { ok: false, raison: "forme" };
  // Rassembler les IDAT
  const parts: Uint8Array[] = [];
  let o = 8, fin = false;
  while (o + 12 <= bytes.length) {
    const len = u32(bytes, o);
    const type = String.fromCharCode(...bytes.slice(o + 4, o + 8));
    if (o + 12 + len > bytes.length) return { ok: false, raison: "chunk" };
    if (type === "IDAT") parts.push(bytes.slice(o + 8, o + 8 + len));
    o += 12 + len;
    if (type === "IEND") { fin = true; break; }
  }
  if (!fin || parts.length === 0) return { ok: false, raison: "chunk" };
  const total = parts.reduce((n, p) => n + p.length, 0);
  const idat = new Uint8Array(total);
  let k = 0; for (const p of parts) { idat.set(p, k); k += p.length; }
  const raw = await inflate(idat);
  const bpp = couleur === 6 ? 4 : 3;
  const ligne = largeur * bpp + 1;
  if (!raw || raw.length !== ligne * hauteur) return { ok: false, raison: "donnees" };
  // Tracé : octets non nuls hors octets de filtre (RGBA transparent vide = tout à zéro).
  // Pour RGB opaque, on exige au moins une variation entre lignes/pixels.
  let encre = 0;
  for (let y = 0; y < hauteur; y++) {
    const base = y * ligne;
    for (let x = 1; x < ligne; x++) {
      const v = raw[base + x];
      if (couleur === 6 ? v !== 0 : v !== 0 && v !== raw[base + 1 + ((x - 1) % bpp)]) { encre++; if (encre > 40) break; }
    }
    if (encre > 40) break;
  }
  if (encre <= 40) return { ok: false, raison: "vide" };
  return { ok: true, largeur, hauteur };
}
