/**
 * RÈGLE : pour une matière partagée entre plusieurs examens, la version de
 * référence est TOUJOURS la dernière modification RÉELLE de cette matière,
 * peu importe l'examen dans lequel elle a été faite.
 *
 * Un simple ré-enregistrement d'un examen (sans modifier la matière) ne doit
 * jamais remettre une ancienne version par-dessus une version plus récente.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { reconcileSharedMatieres, isSameMatiereContent } from "@/components/cours-en-ligne/ExamensBlancsEditor";

const ts = (h: string) => new Date(`2026-09-17T${h}:00.000Z`).getTime();

const matiere = (version: string, editedAt?: string) =>
  ({
    id: "reglementation_taxi",
    nom: "F(T) - Réglementation",
    duree: 30,
    coefficient: 1,
    noteEliminatoire: 6,
    noteSur: 20,
    questions: [{ id: 1, enonce: version, choix: [{ lettre: "A", texte: version, correct: true }] }],
    ...(editedAt ? { _editedAt: editedAt } : {}),
  }) as any;

const exam = (id: string, m: any) => ({ id, type: "TAXI", matieres: [m] }) as any;

describe("Matière partagée — la dernière modification réelle gagne", () => {
  it("TAXI modifié à 14h00, TA ré-enregistré à 14h10 sans modification → la version TAXI reste la référence", () => {
    const examens = [
      exam("bilan-taxi", matiere("version 14h00", "2026-09-17T14:00:00.000Z")),
      exam("bilan-ta", matiere("version 14h00", "2026-09-17T14:00:00.000Z")),
    ];
    // TA a été enregistré plus tard, mais sans toucher la matière.
    reconcileSharedMatieres(examens, { 0: ts("14:00"), 1: ts("14:10") });
    expect(examens[0].matieres[0].questions[0].enonce).toBe("version 14h00");
    expect(examens[1].matieres[0].questions[0].enonce).toBe("version 14h00");
  });

  // Règle actuelle : partage uniquement entre examens de MÊME numéro
  // (VTC N°x ↔ TAXI N°x ↔ TA N°x / VA N°x). Les anciens scénarios utilisaient
  // des Bilans, qui ne partagent plus jamais leurs matières.
  it("3a — EB1 TAXI 14h00 puis modification réelle dans EB1 TA à 15h00 → la version TA devient la référence", () => {
    const examens = [
      exam("EB1-TAXI", matiere("version 14h00", "2026-09-17T14:00:00.000Z")),
      exam("eb1-ta", matiere("version 15h00", "2026-09-17T15:00:00.000Z")),
    ];
    reconcileSharedMatieres(examens, { 0: ts("14:00"), 1: ts("15:00") });
    expect(examens[0].matieres[0].questions[0].enonce).toBe("version 15h00");
    expect(examens[1].matieres[0].questions[0].enonce).toBe("version 15h00");
  });

  it("sens inverse TA → TAXI : modification TA 14h00, TAXI ré-enregistré 14h10 → version TA conservée", () => {
    const examens = [
      exam("bilan-taxi", matiere("version TA 14h00", "2026-09-17T14:00:00.000Z")),
      exam("bilan-ta", matiere("version TA 14h00", "2026-09-17T14:00:00.000Z")),
    ];
    reconcileSharedMatieres(examens, { 0: ts("14:10"), 1: ts("14:00") });
    expect(examens[0].matieres[0].questions[0].enonce).toBe("version TA 14h00");
  });

  it("3b — EB1 VTC → EB1 VA : une copie VA ancienne non horodatée n'écrase jamais une correction VTC horodatée", () => {
    const examens = [
      exam("EB1", matiere("correction VTC", "2026-09-17T14:00:00.000Z")),
      exam("eb1-va", matiere("ancienne version VA")),
    ];
    reconcileSharedMatieres(examens, { 0: ts("14:00"), 1: ts("16:00") });
    expect(examens[0].matieres[0].questions[0].enonce).toBe("correction VTC");
    expect(examens[1].matieres[0].questions[0].enonce).toBe("correction VTC");
  });

  it("3c — EB1 VA → EB1 VTC : une modification réelle VA plus récente devient la référence pour VTC", () => {
    const examens = [
      exam("EB1", matiere("version VTC", "2026-09-17T14:00:00.000Z")),
      exam("eb1-va", matiere("version VA plus récente", "2026-09-17T17:00:00.000Z")),
    ];
    reconcileSharedMatieres(examens, { 0: ts("18:00"), 1: ts("17:00") });
    expect(examens[0].matieres[0].questions[0].enonce).toBe("version VA plus récente");
  });

  it("3d — contenus anciens sans horodatage des deux côtés → comportement historique (dernier module enregistré)", () => {
    const examens = [exam("EB1-TAXI", matiere("A")), exam("eb1-ta", matiere("B"))];
    reconcileSharedMatieres(examens, { 0: ts("10:00"), 1: ts("11:00") });
    expect(examens[0].matieres[0].questions[0].enonce).toBe("B");
  });

  it("une question supprimée dans la version la plus récente ne réapparaît pas depuis une ancienne copie", () => {
    const ancienne = matiere("Q1", "2026-09-17T10:00:00.000Z");
    ancienne.questions = [
      { id: 1, enonce: "Q1", choix: [{ lettre: "A", texte: "Q1", correct: true }] },
      { id: 2, enonce: "Q2 supprimée", choix: [{ lettre: "A", texte: "x", correct: true }] },
    ];
    const recente = matiere("Q1", "2026-09-17T15:00:00.000Z"); // Q2 supprimée
    const examens = [exam("EB1", ancienne), exam("EB1-TAXI", recente)];
    reconcileSharedMatieres(examens, { 0: ts("16:00"), 1: ts("15:00") });
    for (const ex of examens) {
      expect(ex.matieres[0].questions.map((q: any) => q.id)).toEqual([1]);
      expect(JSON.stringify(ex.matieres[0])).not.toContain("Q2 supprimée");
    }
  });

  it("EB1 et EB4 ne se synchronisent jamais, même avec la même matière", () => {
    const examens = [
      exam("EB1", matiere("EB1 ancienne", "2026-09-17T10:00:00.000Z")),
      exam("EB4", matiere("EB4 récente", "2026-09-17T18:00:00.000Z")),
    ];
    reconcileSharedMatieres(examens, { 0: ts("10:00"), 1: ts("18:00") });
    expect(examens[0].matieres[0].questions[0].enonce).toBe("EB1 ancienne");
    expect(examens[1].matieres[0].questions[0].enonce).toBe("EB4 récente");
  });

  it("un Bilan n'est jamais synchronisé avec un autre examen (ni un autre Bilan)", () => {
    const examens = [
      exam("bilan-taxi", matiere("Bilan TAXI", "2026-09-17T10:00:00.000Z")),
      exam("EB1-TAXI", matiere("EB1 TAXI récente", "2026-09-17T18:00:00.000Z")),
      exam("bilan-ta", matiere("Bilan TA récente", "2026-09-17T19:00:00.000Z")),
    ];
    reconcileSharedMatieres(examens, { 0: ts("10:00"), 1: ts("18:00"), 2: ts("19:00") });
    expect(examens[0].matieres[0].questions[0].enonce).toBe("Bilan TAXI");
    expect(examens[1].matieres[0].questions[0].enonce).toBe("EB1 TAXI récente");
    expect(examens[2].matieres[0].questions[0].enonce).toBe("Bilan TA récente");
  });

  it("un ré-enregistrement identique n'est pas vu comme une modification", () => {
    const a = matiere("même contenu", "2026-09-17T14:00:00.000Z");
    const b = matiere("même contenu", "2026-09-17T09:00:00.000Z");
    expect(isSameMatiereContent(a, b)).toBe(true);
    expect(isSameMatiereContent(a, matiere("contenu différent"))).toBe(false);
  });
});
