// @vitest-environment node
import { describe, it, expect } from "vitest";
import { questionsSnapshotCorrigees } from "@/components/cours-en-ligne/bilanSnapshotsEleve";

describe("Passage figé + corrections de l'éditeur", () => {
  const snap = [
    { id: 177, uid: "u1", enonce: "Ancien", image: "photo.jpg", choix: [{ lettre: "A" }, { lettre: "C", correct: true }] },
    { id: 178, uid: "u2", enonce: "Retirée depuis", choix: [] },
  ];
  it("affiche texte, bonne réponse et image actuels, garde ordre, ids et questions retirées", () => {
    const r = questionsSnapshotCorrigees(snap, [
      { id: 177, uid: "u1", enonce: "Nouveau", image: null, choix: [{ lettre: "A", correct: true }, { lettre: "C", correct: false }] },
    ]);
    expect(r.map((q) => q.id)).toEqual([177, 178]);
    expect(r[0].enonce).toBe("Nouveau");
    expect(r[0].image).toBeNull();
    expect(r[0].choix[0].correct).toBe(true);
    expect(r[1].enonce).toBe("Retirée depuis");
  });
});
