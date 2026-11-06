import { describe, expect, it } from "vitest";
import {
  creerRevisionProgressState,
  restaurerRevisionProgressState,
  revisionQuestionKey,
  revisionQuestionOrder,
} from "@/lib/revisionFaussesProgression";
import { nouvelleTentativeRevision } from "@/lib/revisionFaussesTentative";

const questions = [
  { matiere: { id: "t3p" }, question: { id: 1 } },
  { matiere: { id: "gestion" }, question: { id: 1 } },
  { matiere: { id: "securite" }, question: { id: 2 } },
];
const order = revisionQuestionOrder(questions);

describe("révision des questions fausses — identité et reprise", () => {
  it("distingue le même numéro de question dans deux matières et pour EB1–EB6 VTC/TAXI/TA", () => {
    expect(order).toEqual(["t3p:1", "gestion:1", "securite:2"]);
    expect(revisionQuestionKey(questions[0])).not.toBe(revisionQuestionKey(questions[1]));
    for (const exam of ["EB1", "EB2", "EB3", "EB4", "EB5", "EB6", "EB1-TAXI", "EB2-TAXI", "EB3-TAXI", "EB4-TAXI", "EB5-TAXI", "EB6-TAXI", "eb1-ta", "eb2-ta", "eb3-ta", "eb4-ta", "eb5-ta", "eb6-ta"]) {
      expect(creerRevisionProgressState({ examenId: exam, answers: {}, currentIndex: 0, correctedCount: 0, correctedQuestions: [], showCorrection: false, questionOrder: order }).examenId).toBe(exam);
    }
  });

  it("restaure exactement réponse, position, validation, compte et ordre du même examen", () => {
    const saved = { revisionState: creerRevisionProgressState({
      examenId: "EB2-TAXI", answers: { "t3p:1": ["B"], "gestion:1": "texte" },
      currentIndex: 1, correctedCount: 1, correctedQuestions: ["t3p:1", "gestion:1"],
      showCorrection: true, questionOrder: order,
    }) };
    const restored = restaurerRevisionProgressState(saved, "EB2-TAXI", order);
    expect(restored.currentIndex).toBe(1);
    expect(restored.showCorrection).toBe(true);
    expect(restored.answers["gestion:1"]).toBe("texte");
    expect(restored.correctedQuestions).toEqual(["t3p:1", "gestion:1"]);
    expect(restored.correctedCount).toBe(1);
    expect(restored.contexteChange).toBe(false);
  });

  it("ne restaure pas une position sur un autre examen ou un autre ordre, mais ne refait pas les questions validées", () => {
    const state = creerRevisionProgressState({
      examenId: "EB1", answers: { "t3p:1": ["A"] }, currentIndex: 0,
      correctedCount: 1, correctedQuestions: ["t3p:1"], showCorrection: true, questionOrder: order,
    });
    const autreExamen = restaurerRevisionProgressState({ revisionState: state }, "EB1-TAXI", order);
    expect(autreExamen.currentIndex).toBe(1);
    expect(autreExamen.showCorrection).toBe(false);
    expect(autreExamen.answers["t3p:1"]).toEqual(["A"]);
    const nouvelOrdre = [order[1], order[0], order[2]];
    const ordreChange = restaurerRevisionProgressState({ revisionState: state }, "EB1", nouvelOrdre);
    expect(ordreChange.currentIndex).toBe(0);
    expect(ordreChange.contexteChange).toBe(true);
  });

  it("reprend un ancien brouillon à la première question non validée au lieu de forcer zéro", () => {
    const restored = restaurerRevisionProgressState({
      answers: { "t3p:1": ["A"] }, currentIndex: 0, correctedCount: 1, correctedQuestions: ["t3p:1"],
    }, "EB3", order);
    expect(restored.currentIndex).toBe(1);
    expect(restored.showCorrection).toBe(false);
  });

  it("recommencer crée une tentative supplémentaire sans suppression de l'ancienne", () => {
    expect(nouvelleTentativeRevision("revision_fausses_EB1", [
      { exercice_id: "revision_fausses_EB1", completed: false },
      { exercice_id: "revision_fausses_EB1__r2", completed: true },
    ])).toBe("revision_fausses_EB1__r3");
  });
});
