import { describe, it, expect } from "vitest";
import { legacyEnginePendingForRows } from "@/components/cours-en-ligne/exam-helpers";

// Cas Habib BEN MOHAMED EB2 : A,B,D,F,G corrigées dans le nouveau système,
// anciennes lignes « en attente » sur ces mêmes matières, C/E anciens sans QRC.
const legacyPending = new Set(["t3p", "gestion", "francais", "reglementation_vtc", "reglementation_vtc2"]);
const ancien = (mid: string) => legacyPending.has(mid);
const core = (id: string, pending = false) => ({ matiere_id: id, __core: { pending } });
const old = (id: string) => ({ matiere_id: id, __core: null });

describe("ancien registre QRC jugé matière par matière", () => {
  it("cas Habib : ne bloque plus", () => {
    const rows = [core("t3p"), core("gestion"), old("securite"), core("francais"), old("anglais"), core("reglementation_vtc"), core("reglementation_vtc2")];
    expect(legacyEnginePendingForRows(rows, ancien)).toBe(false);
  });
  it("matière ancienne avec QRC ancienne en attente : bloque", () => {
    expect(legacyEnginePendingForRows([core("gestion"), old("t3p")], ancien)).toBe(true);
  });
  it("examen non branché : null (règle historique)", () => {
    expect(legacyEnginePendingForRows([old("securite")], () => null)).toBe(null);
  });
  it("tout nouveau système : l'ancien registre n'est jamais consulté", () => {
    expect(legacyEnginePendingForRows([core("t3p", true)], () => { throw new Error("no"); })).toBe(null);
  });
});
