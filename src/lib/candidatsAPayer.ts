import { fraisExamenCma } from "./fraisExamenCma";
/** Estimation par date de session, jamais une modification des montants enregistrés. VA/TA inchangés. */
export function tarifExamen(type: string | null | undefined, date?: string | Date | null): number {
  const s = (type || "").toLowerCase().trim();
  if (/^(va|ta)\b/.test(s) || s.startsWith("va-") || s.startsWith("ta-")) return 168;
  return fraisExamenCma(date);
}

export function candidatsAPayer<T>(liste: T[], statut: (a: T) => string | null | undefined, type: (a: T) => string | null | undefined, date?: (a: T) => string | Date | null | undefined) {
  const aPayer = (liste ?? []).filter((a) => {
    const st = statut(a);
    return st !== "paye" && st !== "inscription_validee";
  });
  return { nombre: aPayer.length, montant: aPayer.reduce((s, a) => s + tarifExamen(type(a), date?.(a)), 0), liste: aPayer };
}
