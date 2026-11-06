import { describe, expect, it } from "vitest";
import type { Question } from "@/components/cours-en-ligne/examens-blancs-data";
import {
  copierQcmPourImport,
  filtrerQcmBilans,
  MODULES_BILAN_QCM,
  type QcmBilan,
} from "@/components/cours-en-ligne/qcmBilans";

const source: Question = {
  id: 17,
  type: "QCM",
  enonce: "<p>Quelle est la <strong>bonne</strong> réponse ?</p>",
  image: "question.png",
  choix: [
    { lettre: "A", texte: "Réponse A", correct: true, explication: "Preuve A" },
    { lettre: "B", texte: "Réponse B" },
  ],
};

describe("Reprendre un QCM d’un bilan", () => {
  it("couvre les bilans exercices VTC/TAXI/TA/VA et les bilans examen VTC/TAXI/TA/VA", () => {
    expect(MODULES_BILAN_QCM.exercices).toEqual([4, 9, 27, 29]);
    expect(MODULES_BILAN_QCM.examen).toEqual([5, 11, 28, 30]);
  });

  it("copie le contenu et les bonnes réponses avec un nouvel identifiant, sans modifier la source", () => {
    const avant = JSON.stringify(source);
    const copie = copierQcmPourImport(source, 42);
    expect(copie.id).toBe(42);
    expect(copie.type).toBe("QCM");
    expect(copie.enonce).toBe(source.enonce);
    expect(copie.image).toBe("question.png");
    expect(copie.choix).toEqual(source.choix);
    expect(copie).not.toBe(source);
    expect(copie.choix).not.toBe(source.choix);
    copie.choix![0].texte = "Texte modifié dans la cible";
    expect(source.choix![0].texte).toBe("Réponse A");
    expect(JSON.stringify(source)).toBe(avant);
  });

  it("recherche sans tenir compte des accents, aussi dans les propositions", () => {
    const row: QcmBilan = {
      key: "4:100:17",
      moduleId: 4,
      moduleNom: "4.BILAN EXERCICES VTC",
      exerciceTitre: "Bilan Sécurité",
      question: { ...source, enonce: "Règle de priorité", choix: [{ lettre: "A", texte: "Cédez le passage", correct: true }] },
    };
    expect(filtrerQcmBilans([row], "securite cedez")).toEqual([row]);
    expect(filtrerQcmBilans([row], "absent")).toEqual([]);
  });
});
