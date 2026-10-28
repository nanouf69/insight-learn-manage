import { describe, it, expect } from "vitest";
import { mergeSourceExercices } from "@/components/cours-en-ligne/examens-blancs-utils";
import { QUIZ_MUSEES } from "@/components/cours-en-ligne/exercices/connaissances-ville-quiz-data";

const src = [{ id: 7004, titre: "Quiz Adresses Musées", sousTitre: "", actif: true, questions: QUIZ_MUSEES.questions }] as any[];

describe("mergeSourceExercices — liste enregistrée vide", () => {
  it("un quiz 7004 enregistré avec questions: [] affiche les 41 questions du code", () => {
    const out = mergeSourceExercices([{ id: 7004, titre: "Quiz Adresses Musées", sousTitre: "11 questions", actif: true, questions: [] }] as any[], src);
    expect(out[0].questions).toHaveLength(41);
    expect(out[0].questions.map((q: any) => q.id)).toEqual(Array.from({ length: 41 }, (_, i) => i + 1));
  });
  it("une suppression explicite enregistrée reste respectée", () => {
    const out = mergeSourceExercices([{ id: 7004, titre: "x", sousTitre: "", actif: true, questions: [], deletedQuestionIds: [1] }] as any[], src);
    expect(out[0].questions).toHaveLength(0);
  });
  it("une liste enregistrée non vide reste prioritaire", () => {
    const out = mergeSourceExercices([{ id: 7004, titre: "x", sousTitre: "", actif: true, questions: [QUIZ_MUSEES.questions[0]] }] as any[], src);
    expect(out[0].questions).toHaveLength(1);
  });
});
