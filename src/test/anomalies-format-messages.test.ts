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

const matiere = (
  id: string,
  nbQCM: number,
  nbQRC: number,
  extras: Partial<Matiere> = {},
): Matiere =>
  ({
    id,
    nom: id,
    coefficient: FORMATS_OFFICIELS[id]?.coefficient ?? 1,
    noteEliminatoire: FORMATS_OFFICIELS[id]?.eliminatoire ?? 6,
    noteSur: 20,
    ...extras,
    questions: [
      ...Array.from({ length: nbQCM }, (_, i) => qcm(i)),
      ...Array.from({ length: nbQRC }, (_, i) => qrc(i)),
    ],
  }) as unknown as Matiere;

// G(V)/G(T) : QCM 2 pts, QRC 4 pts (comme dans les vraies matières)
const matiereGV = (nbQCM: number, nbQRC: number) =>
  matiere("reglementation_vtc", nbQCM, nbQRC, { ptsQCM: 2, ptsQRC: 4 });

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

  it("Reglementation VTC 11 QCM + 5 QRC → +1 QCM manquant et 1 QRC en trop", () => {
    const a = detectMatiereAnomalies(matiereGV(11, 5));
    const corr = a.find((m) => m.startsWith("À corriger"));
    expect(corr).toContain("+1 QCM à ajouter (2 pts)");
    expect(corr).toContain("−1 QRC à retirer (−4 pts)");
  });

  it("Reglementation VTC 7 QCM + 1 QRC → 1 QCM en trop et 1 QRC manquante", () => {
    const a = detectMatiereAnomalies(matiereGV(7, 1));
    const corr = a.find((m) => m.startsWith("À corriger"));
    expect(corr).toContain("−5 QCM à retirer (−2 pts)");
    expect(corr).toContain("+1 QRC à ajouter (4 pts)");
  });

  it("Format conforme : aucun message format ni total", () => {
    const a = detectMatiereAnomalies(matiere("t3p", 10, 5));
    expect(a).toHaveLength(0);
  });
});
