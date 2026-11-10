import { describe, expect, it } from "vitest";
import { revisionCouvertureConfirmee, revisionResultatConfirme } from "@/lib/revisionFinalisationPreuve";

const order = Array.from({ length: 73 }, (_, i) => `francais:${i + 1}`);
const state = () => ({ revisionState: { examenId: "EB3", questionOrder: order, correctedQuestions: order,
  answers: Object.fromEntries(order.map(k => [k, ["A", "C"]])) } });
describe("Finalisation publiée : preuves indépendantes du compteur de points", () => {
  it("73 réponses validées prouvent la couverture sans limite 50", () => expect(revisionCouvertureConfirmee(state(), "EB3", order)).toBe(true));
  it("la dernière position ne prouve pas une réponse manquante", () => {
    const saved = state(); delete saved.revisionState.answers[order[10]];
    expect(revisionCouvertureConfirmee(saved, "EB3", order)).toBe(false);
  });
  it("une question non validée interdit la finalisation", () => {
    const saved = state(); saved.revisionState.correctedQuestions = order.slice(1);
    expect(revisionCouvertureConfirmee(saved, "EB3", order)).toBe(false);
  });
  it("une autre matière ou liste modifiée ne prouve pas la couverture", () => expect(revisionCouvertureConfirmee(state(), "EB3", [...order.slice(1), "gestion:1"])).toBe(false));
  it("un résultat imparfait peut être réellement terminé", () => {
    const saved = state(); const row = { id: "result", apprenant_id: "owner", quiz_id: "EB3", quiz_type: "revision_fausses",
      score_obtenu: 1, score_max: 73, details: { revision_exercice_id: "revision_fausses_EB3__r2", questionOrder: order, reponses: saved.revisionState.answers } };
    expect(revisionResultatConfirme(row, "owner", "EB3", "revision_fausses_EB3__r2", saved, order, 1)).toBe(true);
    expect(revisionResultatConfirme(row, "other", "EB3", "revision_fausses_EB3__r2", saved, order, 1)).toBe(false);
    expect(revisionResultatConfirme(row, "owner", "EB3", "revision_fausses_EB3", saved, order, 1)).toBe(false);
    expect(revisionResultatConfirme({ ...row, score_max: 50 }, "owner", "EB3", "revision_fausses_EB3__r2", saved, order, 1)).toBe(false);
  });
});