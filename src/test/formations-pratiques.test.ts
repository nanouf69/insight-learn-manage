import { describe, it, expect } from "vitest";
import { DEFAULT_MODULES_BY_TYPE, FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";

describe("Formations pratiques seules", () => {
  it("Formation pratique TAXI = uniquement le module Pratique TAXI (6)", () => {
    expect(FORMATION_MODULES["pratique-taxi"].label).toBe("Formation pratique TAXI");
    expect(DEFAULT_MODULES_BY_TYPE["pratique-taxi"]).toEqual([6]);
  });
  it("Formation pratique VTC = uniquement le module Pratique VTC (8)", () => {
    expect(FORMATION_MODULES["pratique-vtc"].label).toBe("Formation pratique VTC");
    expect(DEFAULT_MODULES_BY_TYPE["pratique-vtc"]).toEqual([8]);
  });
  it("une seule définition chacune, autres formations inchangées", () => {
    expect(Object.keys(FORMATION_MODULES).filter((k) => k.startsWith("pratique"))).toEqual(["pratique-taxi", "pratique-vtc"]);
    expect(DEFAULT_MODULES_BY_TYPE["taxi"]).toContain(10);
    expect(DEFAULT_MODULES_BY_TYPE["vtc"]).toContain(2);
  });
});
