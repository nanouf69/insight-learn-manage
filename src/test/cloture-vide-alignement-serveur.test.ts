import { describe, expect, it } from "vitest";
import { compterReponsesSaisies } from "@/lib/examClotureGarde";
import { classifyAnswerSaveFailure } from "@/lib/answerPersistence";

describe("Comptage local aligné sur eb_reponses_renseignees (P0530)", () => {
  it("valeurs vides ne comptent pas", () => {
    expect(compterReponsesSaisies({ q1: [""], q2: {}, q3: [null], q4: "  ", q5: null, q6: [] })).toBe(0);
  });
  it("vraies réponses comptent", () => {
    expect(compterReponsesSaisies({ q1: ["A"], q2: 0, q3: false, q4: " x ", q5: { t: "r" } })).toBe(5);
  });
  it("refus P0530 est définitif (pas de réessai infini, file conservée)", () => {
    const v = classifyAnswerSaveFailure(400, '{"error":"Clôture refusée : examen blanc sans aucune réponse","code":"P0530"}');
    expect(v.definitif).toBe(true);
  });
});
