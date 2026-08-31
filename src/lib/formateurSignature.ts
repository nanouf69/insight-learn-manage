import { SIGNATURE_NAOUFAL_DATA_URL } from "@/lib/signatureNaoufal";

/**
 * Signatures numérisées des formateurs, indexées par nom normalisé.
 * Ajouter ici les futures signatures scannées (data URL PNG).
 */
const SIGNATURES: Record<string, string> = {
  "naoufal guenichi": SIGNATURE_NAOUFAL_DATA_URL,
  "guenichi naoufal": SIGNATURE_NAOUFAL_DATA_URL,
};

function normalize(name: string): string {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Retourne la signature du formateur si elle existe, sinon null. */
export function getFormateurSignature(name?: string | null): string | null {
  if (!name) return null;
  return SIGNATURES[normalize(name)] || null;
}

/**
 * Parmi une liste de formateurs, retourne le premier dont la signature
 * est disponible (nom + image), sinon le premier nom sans signature.
 */
export function resolveFormateurSignature(
  formateurs: (string | null | undefined)[],
): { nom: string; signature: string | null } {
  const names = formateurs.filter((f): f is string => !!f && f.trim().length > 0);
  for (const n of names) {
    const sig = getFormateurSignature(n);
    if (sig) return { nom: n, signature: sig };
  }
  return { nom: names[0] || "", signature: null };
}
