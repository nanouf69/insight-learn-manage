// Logique pure du lien « Je confirme avoir reçu cet e-mail » (testable hors Deno).
export const DUREE_VALIDITE_MS = 30 * 24 * 3600 * 1000;

export function nouveauJeton(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function hacherJeton(jeton: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(jeton));
  return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, "0")).join("");
}

export function masquerEmail(email: string): string {
  const [u, d] = email.split("@");
  if (!d) return "***";
  return `${u.slice(0, 2)}***@${d}`;
}

export interface LigneConfirmation {
  expires_at: string;
  confirmed_at: string | null;
}

export type Decision =
  | { action: "confirmer" }
  | { action: "deja_confirme"; date: string }
  | { action: "expire" }
  | { action: "introuvable" };

/** Anti-rejeu : une seule confirmation, jamais réécrite. */
export function deciderConfirmation(l: LigneConfirmation | null, maintenant = Date.now()): Decision {
  if (!l) return { action: "introuvable" };
  if (l.confirmed_at) return { action: "deja_confirme", date: l.confirmed_at };
  if (new Date(l.expires_at).getTime() <= maintenant) return { action: "expire" };
  return { action: "confirmer" };
}
