// @vitest-environment node
import { describe, expect, it } from "vitest";
import { contenuVersionDepuisExamen } from "@/features/noyau-passage/pontV2";
import { projeterMatiereDepuisSnapshot } from "@/features/noyau-passage/snapshotMatiere";
import { prochainIdQuestionDisponible } from "@/components/cours-en-ligne/examQuestionIdentity";

const examen = (): any => ({
  id: "EB-TEST", numero: 99, type: "VTC", titre: "Fictif",
  matieres: [{ id: "gestion", nom: "Gestion", duree: 30, coefficient: 2, noteSur: 20, noteEliminatoire: 6, ptsQCM: 1, ptsQRC: 2, questions: [
    { id: 1, type: "QCM", enonce: "QCM V1", choix: [{ lettre: "A", texte: "A", correct: true }, { lettre: "B", texte: "B" }] },
    { id: 2, type: "QRC", enonce: "QRC V1", reponseQRC: "Corrigé V1", reponses_possibles: ["v1"] },
  ] }],
});

describe("édition et versions concurrentes", () => {
  it("modification clé/corrigé/barème, ajout, suppression et réordre ne réécrivent pas V1", () => {
    const courant = examen();
    const v1 = contenuVersionDepuisExamen(courant);
    const copieV1 = JSON.parse(JSON.stringify(v1));
    courant.matieres[0].duree = 45;
    courant.matieres[0].ptsQCM = 3;
    courant.matieres[0].questions[0].choix[0].correct = false;
    courant.matieres[0].questions[0].choix[1].correct = true;
    courant.matieres[0].questions[1].reponseQRC = "Corrigé V2";
    courant.matieres[0].questions = [courant.matieres[0].questions[1], { id: 8, type: "QCM", enonce: "Ajout V2", choix: [{ lettre: "A", texte: "A", correct: true }] }];
    const v2 = contenuVersionDepuisExamen(courant);
    expect(v1).toEqual(copieV1);
    expect(v1.questions.map((q) => q.id)).toEqual(["gestion:1", "gestion:2"]);
    expect(v1.questions[0].choix?.[0].correct).toBe(true);
    expect(v1.questions[1].reponseQRC).toBe("Corrigé V1");
    expect(v1.matieres[0]).toMatchObject({ duree: 30, note_eliminatoire: 6 });
    expect(v2.questions.map((q) => q.id)).toEqual(["gestion:2", "gestion:8"]);
    expect(v2.questions[0].reponseQRC).toBe("Corrigé V2");
    expect(v2.questions[1].points).toBe(3);
    expect(v2.matieres[0].duree).toBe(45);
  });

  it("deux passages simultanés restent chacun sur leur version", () => {
    const courant = examen();
    const v1 = contenuVersionDepuisExamen(courant);
    const passageV1 = projeterMatiereDepuisSnapshot({ matiere: "gestion", matieres: v1.matieres, questions: v1.questions }, "gestion");
    courant.matieres[0].questions[0].enonce = "QCM V2";
    courant.matieres[0].questions.reverse();
    const v2 = contenuVersionDepuisExamen(courant);
    const passageV2 = projeterMatiereDepuisSnapshot({ matiere: "gestion", matieres: v2.matieres, questions: v2.questions }, "gestion");
    expect(passageV1.ok && passageV1.matiere.questions.map((q) => q.enonce)).toEqual(["QCM V1", "QRC V1"]);
    expect(passageV2.ok && passageV2.matiere.questions.map((q) => q.enonce)).toEqual(["QRC V1", "QCM V2"]);
  });

  it("la suppression du plus grand ID ne permet pas son recyclage", () => {
    const matiere = { prochainIdQuestion: 9, questions: [{ id: 3 }] } as any;
    expect(prochainIdQuestionDisponible(matiere)).toBe(9);
    matiere.questions = [];
    expect(prochainIdQuestionDisponible(matiere)).toBe(9);
  });
});
