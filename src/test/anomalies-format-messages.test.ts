// @vitest-environment node
import { describe, it, expect } from "vitest";
import { detectMatiereAnomalies, FORMATS_OFFICIELS } from "../components/cours-en-ligne/examens-blancs-anomalies";
import type { Matiere, Question } from "../components/cours-en-ligne/examens-blancs-data";

const qcm = (i: number): Question => ({
  id: `qcm${i}`,
  type: "QCM",
  enonce: `Question QCM ${i} ?`,
  choix: [
    { lettre: "A", texte: "Prop A", correct: true },
    { lettre: "B", texte: "Prop B", correct: false },
  ],
});
const qrc = (i: number): Question => ({
  id: `qrc${i}`,
  type: "QRC",
  enonce: `Question QRC ${i} ?`,
  reponseQRC: "Réponse attendue détaillée.",
});

const matiere = (id: string, nbQCM: number, nbQRC: number): Matiere =>
  ({
    id,
    nom: id,
    coefficient: FORMATS_OFFICIELS[id]?.coefficient ?? 1,
    noteEliminatoire: FORMATS_OFFICIELS[id]?.eliminatoire ?? 6,
    noteSur: 20,
    questions: [
      ...Array.from({ length: nbQCM }, (_, i) => qcm(i)),
      ...Array.from({ length: nbQRC }, (_, i) => qrc(i)),
    ],
  }) as unknown as Matiere;

describe("Anomalies format — messages précis", () => {
  it("T3P 10 QCM + 4 QRC → il manque 1 QRC (2 pts)", () => {
    const a = detectMatiereAnomalies(matiere("t3p", 10, 4));
    expect(a.some((m) => m.startsWith("Format incorrect — Actuel : 10 QCM + 4 QRC"))).toBe(true);
    expect(a.some((m) => m === "Attendu : 10 QCM + 5 QRC = 20/20 (15 questions)")).toBe(true);
    expect(a.some((m) => m.includes("À corriger : +1 QRC à ajouter (2 pts)"))).toBe(true);
  });

  it("Gestion 15 QCM + 2 QRC → il manque 1 QCM (1 pt)", () => {
    const a = detectMatiereAnomalies(matiere("gestion", 15, 2));
    expect(a.some((m) => m.includes("À corriger : +1 QCM à ajouter (1 pt)"))).toBe(true);
  });

  it("Français 11 QCM + 5 QRC → +1 QCM manquant et 1 QRC en trop", () => {
    const a = detectMatiereAnomalies(matiere("francais", 11, 5));
    const corr = a.find((m) => m.startsWith("À corriger"));
    expect(corr).toContain("+1 QCM à ajouter (2 pts)");
    expect(corr).toContain("−1 QRC à retirer (−2 pts)");
  });

  it("Français 7 QCM + 1 QRC → 1 QRC manquante seulement", () => {
    const a = detectMatiereAnomalies(matiere("francais", 7, 1));
    expect(a.some((m) => m.includes("À corriger : +2 QRC à ajouter (2 pts)"))).toBe(true);
  });

  it("Format conforme : aucun message format ni total", () => {
    const a = detectMatiereAnomalies(matiere("t3p", 10, 5));
    expect(a).toHaveLength(0);
  });
});
