// @vitest-environment node
import { describe, it, expect } from "vitest";
import { questionsSnapshotCorrigees } from "@/components/cours-en-ligne/bilanSnapshotsEleve";

// Module bilan fictif (aucune vraie question) : photo ajoutée dans l'éditeur après ouverture du passage.
describe("Module bilan fictif — photo ajoutée après ouverture", () => {
  it("l'élève voit la nouvelle photo, ordre et questions du passage conservés", () => {
    const passageFige = [
      { id: 1, uid: "fictif-1", enonce: "Ce panneau signifie :", image: "", choix: [{ lettre: "A", correct: true }] },
      { id: 2, uid: "fictif-2", enonce: "Question 2", image: "question-images/ancienne.png", choix: [{ lettre: "B", correct: true }] },
    ];
    const editeur = [
      { id: 2, uid: "fictif-2", enonce: "Question 2", image: "question-images/nouvelle.png", choix: [{ lettre: "B", correct: true }] },
      { id: 1, uid: "fictif-1", enonce: "Ce panneau signifie :", image: "question-images/panneau.png", choix: [{ lettre: "A", correct: true }] },
      { id: 3, uid: "fictif-3", enonce: "Ajoutée après", image: "x.png", choix: [] },
    ];
    const r = questionsSnapshotCorrigees(passageFige as any, editeur as any) as any[];
    expect(r.map((q) => q.id)).toEqual([1, 2]);
    expect(r[0].image).toBe("question-images/panneau.png");
    expect(r[1].image).toBe("question-images/nouvelle.png");
  });
});
