import { describe, it, expect } from "vitest";
import { computeLearnerQuizNumbers } from "@/lib/exercicePartNumbers";
describe("numéro de quiz côté élève", () => {
  it("matière F, 4e partie → 6.4 ; 5e → 6.5", () => {
    const cours = [1,2,3,4,5].map(i => ({ id: i, titre: `F. RÉGLEMENTATION ${i}`, actif: true }));
    const exos = [1,2,3,4,5].map(i => ({ id: 100+i, titre: `Quiz ${i}`, actif: true, questions: [{}] }));
    const m = computeLearnerQuizNumbers(99, cours, exos);
    expect(m.get(104)).toBe("6.4");
    expect(m.get(105)).toBe("6.5");
  });
});
