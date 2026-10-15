import { describe, it, expect } from "vitest";
import { estApprenantElearning } from "../../supabase/functions/_shared/qrcIaRegles";
describe("estApprenantElearning", () => {
  it("présentiel pur exclu", () => { expect(estApprenantElearning("vtc", null)).toBe(false); expect(estApprenantElearning("vtc", "presentielle")).toBe(false); });
  it("e-learning synchrone/asynchrone inclus", () => { expect(estApprenantElearning("vtc", "elearning_synchrone")).toBe(true); expect(estApprenantElearning("ta", "elearning_asynchrone")).toBe(true); });
  it("type e-learning sans modalité inclus", () => { expect(estApprenantElearning("vtc-e", null)).toBe(true); });
  it("contradictoire type e-learning + modalité présentielle : type gagne (pas d'exclusion)", () => { expect(estApprenantElearning("vtc-e", "presentielle")).toBe(true); });
  it("valeurs inconnues/vides", () => { expect(estApprenantElearning(null, "")).toBe(false); expect(estApprenantElearning("", "elearning_x")).toBe(false); });
});
