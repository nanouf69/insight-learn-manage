import { trouverExamenTheorique } from "@/lib/examDatesConfig";

/** « limite 11 septembre » (année omise si identique à l'examen) ; null si non publiée. Lit la source commune. */
export function limiteCourte(dateExamen: string | null | undefined): string | null {
  const e = trouverExamenTheorique(dateExamen);
  if (!e?.dateLimite || !e.dateLimiteLibelle) return null;
  const lib = e.dateLimiteLibelle.replace(/\s+à\s+.*$/, "");
  return `limite ${e.dateLimite.slice(0, 4) === e.iso.slice(0, 4) ? lib.replace(/\s+\d{4}$/, "") : lib}`;
}
