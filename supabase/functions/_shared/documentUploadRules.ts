export const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;
export const DOCUMENT_MAX_MB = 4;
export const DOCUMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'bmp', 'tiff', 'tif', 'gif'];
export const DOCUMENT_ACCEPT = DOCUMENT_EXTENSIONS.map(ext => `.${ext}`).join(',');
export function documentValidation(file: { name: string; size: number }, imageOnly = false): string | null {
  if (file.size > DOCUMENT_MAX_BYTES) return 'Fichier trop volumineux (max 4 Mo)';
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  if (!DOCUMENT_EXTENSIONS.includes(ext) || (imageOnly && ext === 'pdf')) return 'Format non accepté : PDF ou image requis (image uniquement pour la photo).';
  return null;
}
export async function verifyOnboardingDocumentToken(apprenantId: string, token: string, secret: string, now = Date.now()): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^[a-f0-9]{64}$/.test(parts[1])) return false;
  const [exp, signature] = parts;
  if (Number(exp) * 1000 <= now) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytes = new Uint8Array(signature.match(/../g)?.map(v => parseInt(v, 16)) ?? []);
  return crypto.subtle.verify('HMAC', key, bytes, enc.encode(`onboarding:${apprenantId}:${exp}`));
}