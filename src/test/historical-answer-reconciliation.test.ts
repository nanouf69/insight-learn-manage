import { describe, expect, it } from "vitest";
import { reconcileHistoricalAnswers } from "@/lib/historicalAnswerReconciliation";

describe("historical learner answer reconciliation", () => {
  it("keeps an answer already attached to the current question id", () => {
    const result = reconcileHistoricalAnswers(
      { "7010-1": ["A"] },
      [{ exerciceId: 7010, questionId: 1, enonce: "Question A", reponseEleve: ["B"] }],
      [{ id: 7010, questions: [{ id: 1, enonce: "Question A" }] }],
    );
    expect(result["7010-1"]).toEqual(["A"]);
  });

  it("reattaches a saved answer when only the question id changed", () => {
    const result = reconcileHistoricalAnswers(
      { "250-14": ["B", "D"] },
      [{ exerciceId: 250, questionId: 14, enonce: "Quelle est la règle ?", reponseEleve: ["B", "D"] }],
      [{ id: 250, questions: [{ id: 37, enonce: "Quelle est la règle ?" }] }],
    );
    expect(result["250-37"]).toEqual(["B", "D"]);
  });

  it("uses the immutable completion snapshot if the attempt map lacks the old key", () => {
    const result = reconcileHistoricalAnswers(
      {},
      [{ exerciceId: 70, questionId: 2, enonce: "Texte historique", reponseEleve: "réponse libre" }],
      [{ id: 70, questions: [{ id: 9, enonce: "Texte historique" }] }],
    );
    expect(result["70-9"]).toBe("réponse libre");
  });

  it("does not guess when two historical questions have the same wording", () => {
    const result = reconcileHistoricalAnswers(
      { "70-1": ["A"], "70-2": ["B"] },
      [
        { exerciceId: 70, questionId: 1, enonce: "Même texte", reponseEleve: ["A"] },
        { exerciceId: 70, questionId: 2, enonce: "Même texte", reponseEleve: ["B"] },
      ],
      [{ id: 70, questions: [{ id: 9, enonce: "Même texte" }] }],
    );
    expect(result["70-9"]).toBeUndefined();
  });
});