/**
 * Transport des réponses élèves sans caractère NUL (U+0000).
 *
 * PostgreSQL refuse U+0000 dans jsonb/text (SQLSTATE 22P05 « unsupported Unicode
 * escape sequence ») : une seule réponse contenant ce caractère invisible faisait
 * refuser TOUT le lot en test isolé ; attribution au payload Ahmed NON PROUVÉE.
 *
 * Codage RÉVERSIBLE et sans perte, appliqué uniquement au transport/stockage :
 *   U+0000 → « ␀ » (U+2400) + U+034F (invisible)
 *   « ␀ » littéral → « ␀␀ »
 * Tout autre caractère est inchangé. decoderTransport(encoderTransport(x)) === x
 * pour toute valeur JSON. La file locale de l'appareil garde toujours l'original.
 *
 * COPIE IDENTIQUE : supabase/functions/upsert-reponse-apprenant/transportSansNul.ts
 * (vérifié par test). Ne modifier que les deux ensemble.
 */
export const TRANSPORT_ENCODAGE = "nul-u2400-v1";
const NUL = "\u0000";
const E = "\u2400";
const G = "\u034F";

export function contientNul(value: unknown): boolean {
  if (typeof value === "string") return value.includes(NUL);
  if (Array.isArray(value)) return value.some(contientNul);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(([k, v]) => k.includes(NUL) || contientNul(v));
  }
  return false;
}

const encoderTexte = (s: string) => (s.includes(NUL) || s.includes(E) ? s.replace(/[\u0000\u2400]/g, (c) => (c === NUL ? E + G : E + E)) : s);

function decoderTexte(s: string): string {
  if (!s.includes(E)) return s;
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === E && (s[i + 1] === G || s[i + 1] === E)) {
      out += s[i + 1] === G ? NUL : E;
      i += 1;
    } else {
      out += c;
    }
  }
  return out;
}

function transformer(value: unknown, f: (s: string) => string): unknown {
  if (typeof value === "string") return f(value);
  if (Array.isArray(value)) return value.map((v) => transformer(v, f));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[f(k)] = transformer(v, f);
    return out;
  }
  return value;
}

/** Valeur transmissible à la base (aucun U+0000), réversible sans perte. */
export function encoderTransport<T>(value: T): T {
  return transformer(value, encoderTexte) as T;
}

/** Inverse exact de encoderTransport (restitue les U+0000 d'origine). */
export function decoderTransport<T>(value: T): T {
  return transformer(value, decoderTexte) as T;
}

/** Contrat préparé uniquement : un lecteur ne décode JAMAIS une valeur non marquée. */
export function decoderValeurMarquee<T>(value: T, version: unknown): T {
  if (version == null) return value;
  if (version !== TRANSPORT_ENCODAGE) throw new Error("ENCODAGE_VERSION_INCONNUE");
  return decoderTransport(value);
}
