import { classifierSignatures } from "@/lib/signaturesManquantes";

/** Display-only: no personal financing, a real practical signature and no latest EDOF validation. */
export function pratiqueEdofEnAttente(signatures: any[], inscriptions: any[], reservations: any[], configs: any[], valideEdof: boolean, modeFinancement?: string | null): string[] {
  if (valideEdof || modeFinancement?.trim().toLowerCase() === "personnel") return [];
  const pratique = inscriptions.filter(r => /pratique/i.test(String(r.sessions?.type_session ?? "")));
  const classification = classifierSignatures(signatures, pratique, reservations, undefined, configs);
  return [...new Set(classification.valides.map(s => s.date))].sort();
}