/**
 * SÉCURITÉ 2 — Le statut réussi/échoué utilise EXACTEMENT la même règle que le
 * résultat définitif : barème de la matière + seuil éliminatoire
 * (6/20 partout, 4/20 en Anglais). Jamais un simple « moyenne ≥ 10 ».
 * Et tant qu'une QRC reste à corriger : aucun statut définitif.
 */
import { describe, it, expect } from "vitest";
import { computeReussiForResult, getNoteEliminatoireSur20 } from "@/components/cours-en-ligne/exam-helpers";

const matiere = (over: any = {}) => ({ id: "B", nom: "Gestion", noteSur: 20, noteEliminatoire: 6, ...over });

describe("Statut réussi/échoué — règle unique", () => {
  it("6/20 n'est pas éliminatoire, 5/20 l'est", () => {
    expect(computeReussiForResult({ score_obtenu: 6, score_max: 20, details: {} }, matiere())).toBe(true);
    expect(computeReussiForResult({ score_obtenu: 5, score_max: 20, details: {} }, matiere())).toBe(false);
  });

  it("Anglais : 4/20 n'est pas éliminatoire, 3/20 l'est", () => {
    const anglais = matiere({ id: "E", nom: "Anglais", noteEliminatoire: 4 });
    expect(computeReussiForResult({ score_obtenu: 4, score_max: 20, details: {} }, anglais)).toBe(true);
    expect(computeReussiForResult({ score_obtenu: 3, score_max: 20, details: {} }, anglais)).toBe(false);
  });

  it("respecte le barème de la matière (score sur 30 ramené sur 20)", () => {
    const m = matiere({ noteSur: 30 });
    // 9/30 = 6/20 → non éliminatoire
    expect(computeReussiForResult({ score_obtenu: 9, score_max: 30, details: {} }, m)).toBe(true);
    // 7/30 = 4,67/20 → éliminatoire
    expect(computeReussiForResult({ score_obtenu: 7, score_max: 30, details: {} }, m)).toBe(false);
  });

  it("n'utilise jamais la règle « ≥ 10 »", () => {
    // 8/20 serait « échoué » avec une règle ≥ 10, mais n'est pas éliminatoire.
    expect(computeReussiForResult({ score_obtenu: 8, score_max: 20, details: {} }, matiere())).toBe(true);
  });

  it("aucun statut définitif tant qu'une QRC n'est pas validée", () => {
    const details = {
      qrc_pending_correction: true,
      questions: [{ questionId: "3", type: "QRC" }],
      correctionsIA: {},
    };
    expect(computeReussiForResult({ score_obtenu: 18, score_max: 20, details }, matiere())).toBeNull();
  });

  it("le statut redevient calculable une fois la QRC validée par l'administrateur", () => {
    const details = {
      qrc_pending_correction: true,
      questions: [{ questionId: "3", type: "QRC" }],
      correctionsIA: { "3": { validatedByAdmin: true, pointsObtenus: 2 } },
    };
    expect(computeReussiForResult({ score_obtenu: 18, score_max: 20, details }, matiere())).toBe(true);
  });

  it("retrouve le seuil depuis le snapshot figé de la tentative", () => {
    expect(getNoteEliminatoireSur20({ snapshot: { noteEliminatoire: 4 } })).toBe(4);
    expect(getNoteEliminatoireSur20({}, "Anglais - Partie 1")).toBe(4);
    expect(getNoteEliminatoireSur20({}, "Gestion")).toBe(6);
  });
});
