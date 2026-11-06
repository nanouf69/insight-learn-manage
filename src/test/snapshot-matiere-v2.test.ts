// @vitest-environment node
import { describe, expect, it } from "vitest";
import { projeterMatiereDepuisSnapshot } from "@/features/noyau-passage/snapshotMatiere";

const snapshot = () => ({
  matiere: "gestion",
  matieres: [{ subject_id: "gestion", titre: "Gestion figée", duree: 20, coefficient: 2, note_sur: 20, note_eliminatoire: 6 }],
  questions: [
    { id: "gestion:1", matiere: "gestion", type: "QCM", enonce: "QCM initial", points: 1, choix: [{ lettre: "A", texte: "Oui", correct: true }, { lettre: "B", texte: "Non" }] },
    { id: "gestion:2", matiere: "gestion", type: "QRC", enonce: "QRC initiale", points: 2, reponseQRC: "Corrigé initial", reponses_possibles: ["initial"] },
  ],
});

describe("projection exclusive du snapshot V2", () => {
  it("conserve énoncés, options, clés, corrigés, barèmes, ordre et durée sans le sujet courant", () => {
    const result = projeterMatiereDepuisSnapshot(snapshot(), "gestion");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.matiere).toMatchObject({ nom: "Gestion figée", duree: 20, coefficient: 2, noteSur: 20, noteEliminatoire: 6 });
    expect(result.matiere.questions.map((q) => [q.id, q.enonce, q.points])).toEqual([[1, "QCM initial", 1], [2, "QRC initiale", 2]]);
    expect(result.matiere.questions[0].choix?.[0]).toMatchObject({ lettre: "A", correct: true });
    expect(result.matiere.questions[1]).toMatchObject({ reponseQRC: "Corrigé initial", reponses_possibles: ["initial"] });
  });

  it("signale une reprise historique incomplète au lieu de deviner", () => {
    const incomplete = snapshot() as any;
    incomplete.questions[0].points = undefined;
    const result = projeterMatiereDepuisSnapshot(incomplete, "gestion");
    expect(result).toMatchObject({ ok: false });
    if (result.ok === false) expect(result.raisons.join(" ")).toContain("barème absent");
  });

  it("refuse une clé QCM absente et les identifiants dupliqués", () => {
    const invalid = snapshot();
    invalid.questions[0].choix[0].correct = false;
    invalid.questions[1].id = "gestion:1";
    const result = projeterMatiereDepuisSnapshot(invalid, "gestion");
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.raisons.join(" ")).toContain("bonne réponse absente");
      expect(result.raisons.join(" ")).toContain("identifiant dupliqué");
    }
  });
});
