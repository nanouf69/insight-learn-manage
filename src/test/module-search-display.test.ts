import { describe, it, expect } from "vitest";
import { exercicesAffichesPourRecherche, type SearchCanonicalRow } from "@/components/cours-en-ligne/module-search-display";

const row = (p: Partial<SearchCanonicalRow>): SearchCanonicalRow => ({
  question_id: "q", quiz_id: "bilan-examen-taxi", section_id: 606, legacy_question_id: 1,
  position: 1, enonce: "x", choix: [], explication: null, active: true, ...p,
});

describe("recherche = questions affichées", () => {
  it("remplace les questions JSON par les questions actives affichées et retire les inactives", () => {
    const ex = [{ id: 606, questions: [{ id: 1, enonce: "ancien" }, { id: 2, enonce: "masquée" }] }, { id: 999, questions: [{ id: 5 }] }];
    const out = exercicesAffichesPourRecherche(11, ex,
      [row({ question_id: "a", legacy_question_id: 1, enonce: "affichée" }), row({ question_id: "b", legacy_question_id: 2, active: false })],
      [{ module_id: 11, quiz_id: "bilan-examen-taxi", exercise_id: 606, section_id: 606 }]);
    expect(out[0].questions.map((q: any) => q.id)).toEqual([1]);
    expect(out[0].questions[0].enonce).toBe("affichée");
    expect(out[1]).toBe(ex[1]);
  });

  it("sans rattachement, le contenu enregistré est conservé", () => {
    const ex = [{ id: 606, questions: [{ id: 1 }] }];
    expect(exercicesAffichesPourRecherche(11, ex, [], [])).toBe(ex);
  });
});
