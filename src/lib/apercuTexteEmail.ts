/**
 * Aperçu lisible d'un e-mail : retire balises, styles et scripts d'un aperçu
 * HTML stocké (body_preview tronqué à 200 caractères, parfois avec balise ouverte).
 * Affichage seul : la valeur enregistrée n'est jamais modifiée.
 */
const ENTITES: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'",
  "&eacute;": "é", "&egrave;": "è", "&agrave;": "à", "&ccedil;": "ç", "&ecirc;": "ê", "&euro;": "€",
};

export function apercuTexteEmail(valeur: string | null | undefined, max = 220): string {
  let s = valeur ?? "";
  if (!/[<&]/.test(s)) return s.replace(/\s+/g, " ").trim().slice(0, max);
  s = s
    .replace(/<(style|script|head)[\s\S]*?(<\/\1>|$)/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6])>/gi, " ")
    .replace(/<\/?[a-z!][^>]*>/gi, " ")
    .replace(/<\/?[a-z][^>]*$/gi, " ") // balise tronquée en fin d'aperçu
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITES[e.toLowerCase()] ?? " ");
  return s.replace(/\s+/g, " ").trim().slice(0, max);
}
