import { describe, it, expect } from "vitest";
import { computeLearnerQuizNumbers } from "@/lib/exercicePartNumbers";
describe("numéro de quiz côté élève", () => {
  it("matière F, 4e partie → 6.4 ; 5e → 6.5", () => {
    const cours = [10014,10015,10016,10017,10018].map((id, i) => ({ id, titre: `F. RÉGLEMENTATION ${i}`, actif: true }));
    const exos = [70,71,73,74,75].map((id, i) => ({ id, titre: `Quiz ${i}`, actif: true, questions: [{}] }));
    const m = computeLearnerQuizNumbers(10, cours, exos);
    expect(m.get(74)).toBe("6.4");
    expect(m.get(75)).toBe("6.5");
  });
});
