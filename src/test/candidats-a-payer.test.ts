// @vitest-environment node
import { describe, it, expect } from "vitest";
import { candidatsAPayer, tarifExamen } from "@/lib/candidatsAPayer";
describe("candidats à payer", () => {
  it("VTC 241", () => expect(tarifExamen("vtc")).toBe(241));
  it("TAXI 241", () => expect(tarifExamen("taxi")).toBe(241));
  it("VA 168", () => expect(tarifExamen("va")).toBe(168));
  it("TA 168", () => expect(tarifExamen("TA")).toBe(168));
  it("payé et inscription validée exclus", () => {
    const l = [{ s: "paye", t: "vtc" }, { s: "inscription_validee", t: "taxi" }, { s: null, t: "vtc" }, { s: "document_complet", t: "ta" }];
    expect(candidatsAPayer(l, (a) => a.s, (a) => a.t)).toEqual({ nombre: 2, montant: 409 });
  });
});
