import { describe, it, expect } from "vitest";
import { learnerQuizLabel } from "@/lib/exercicePartNumbers";
describe("learnerQuizLabel", () => {
  it("module matière n°6 TAXI, quiz 4 → 6.4", () => expect(learnerQuizLabel(24, "4")).toBe("6.4"));
  it("module hors matière garde le numéro seul", () => expect(learnerQuizLabel(9, "3")).toBe("3"));
});
