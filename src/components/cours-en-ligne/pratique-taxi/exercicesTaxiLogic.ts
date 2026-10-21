// Logique pure des exercices PRATIQUE TAXI. « Terminé » = toutes les étapes répondues
// (jamais un score) ; le score reste un repère pédagogique non noté.
import type { ChampRtst, QuestionQcm, Scenario } from "./exercicesTaxiData";

/** Lit un montant saisi (« 10,33 », « 10.33 € », « 4 ») ; null si illisible. */
export function lireMontant(v: string | null | undefined): number | null {
  if (v == null) return null;
  const t = String(v).replace(/€/g, "").replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
const proche = (a: number, b: number) => Math.abs(a - b) <= 0.02;

export type SaisieRtst = Partial<Record<ChampRtst, string>>;
export function evaluerScenario(sc: Scenario, s: SaisieRtst): Record<ChampRtst, boolean> {
  const m = (c: "reservation" | "supplements" | "attente") => { const n = lireMontant(s[c]); return n != null && sc.acceptes[c].some((x) => proche(x, n)); };
  return {
    reservation: m("reservation"),
    tarif: sc.acceptes.tarif.includes((s.tarif ?? "").trim()),
    supplements: m("supplements"),
    attente: m("attente"),
  };
}
export const saisieComplete = (s: SaisieRtst | undefined) =>
  !!s && (["reservation", "tarif", "supplements", "attente"] as ChampRtst[]).every((c) => (c === "tarif" ? !!s.tarif : lireMontant(s[c]) != null));

export const qcmJuste = (q: QuestionQcm, choix: number | undefined) => choix === q.bonne;
export const qcmTermine = (qs: QuestionQcm[], rep: Record<string, number>) => qs.every((q) => typeof rep[q.id] === "number");
export const scenariosTermines = (ids: string[], valides: Record<string, unknown>) => ids.every((id) => !!valides[id]);
