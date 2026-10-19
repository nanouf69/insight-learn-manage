/** Frais d'examen à encaisser : VTC/TAXI 241 €, VA/TA 168 €. Exclus : « paye » et « inscription_validee ». */
export function tarifExamen(type: string | null | undefined): number {
  const s = (type || "").toLowerCase().trim();
  if (/^(va|ta)\b/.test(s) || s.startsWith("va-") || s.startsWith("ta-")) return 168;
  return 241;
}

export function candidatsAPayer<T>(liste: T[], statut: (a: T) => string | null | undefined, type: (a: T) => string | null | undefined) {
  const aPayer = (liste ?? []).filter((a) => {
    const st = statut(a);
    return st !== "paye" && st !== "inscription_validee";
  });
  return { nombre: aPayer.length, montant: aPayer.reduce((s, a) => s + tarifExamen(type(a)), 0) };
}
