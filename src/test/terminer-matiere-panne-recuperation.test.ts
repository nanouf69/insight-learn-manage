// @vitest-environment node
/**
 * POINT 11 — SÉCURISATION ABSOLUE DE « TERMINER LA MATIÈRE ».
 *
 * Sauvegarder les réponses et finaliser la matière sont deux choses distinctes :
 * même si la finalisation tombe totalement en panne, rien de ce que l'élève a
 * fait ne disparaît et les points automatiques restent recalculables.
 *
 * Vérifications après chaque scénario : 0 réponse perdue, 0 point perdu,
 * 0 note artificielle à 0, 0 QRC manquante, 0 QRC en double, 0 QRC déjà
 * corrigée qui réapparaît. Aucun test n'écrit en base.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

import { recoverMatiereFromSavedAnswers, canFinalizeMatiere } from "@/lib/examMatiereRecovery";
import { resolveIdempotentTentative, runFinalizationOnce, buildFinalizationKey } from "@/lib/examFinalizationGuard";
import { groupPassages, getQrcToCorrect, getQrcState } from "@/lib/examPassageIdentity";
import {
  enqueueAnswerSave,
  getPendingAnswers,
  setAnswerSaveAuthToken,
  setAnswerSaveOwnership,
} from "@/lib/answerPersistence";

const matiere: any = {
  id: "t3p",
  nom: "A - T3P",
  noteSur: 20,
  noteEliminatoire: 6,
  coefficient: 1,
  questions: [
    { id: 1, type: "QCM", enonce: "Q1", choix: [{ texte: "A", correct: true }, { texte: "B", correct: false }] },
    { id: 2, type: "QCM", enonce: "Q2", choix: [{ texte: "A", correct: false }, { texte: "B", correct: true }] },
    { id: 3, type: "QCM", enonce: "Q3", choix: [{ texte: "A", correct: true }, { texte: "B", correct: false }] },
    { id: 4, type: "QRC", enonce: "Q4 (QRC)", reponseQRC: "réponse attendue" },
    { id: 5, type: "QRC", enonce: "Q5 (QRC)", reponseQRC: "réponse attendue" },
  ],
};

const reponsesCompletes = { "1": ["A"], "2": ["B"], "3": ["B"], "4": "ma réponse QRC", "5": "   " };

describe("Panne complète de « Terminer la matière »", () => {
  it("toutes les réponses restent présentes après l'échec de la finalisation", () => {
    const rec = recoverMatiereFromSavedAnswers({ matiere, reponses: reponsesCompletes });
    expect(rec.reponses).toEqual(reponsesCompletes);
    expect(Object.keys(rec.reponses)).toHaveLength(5);
    expect(rec.answeredCount).toBe(4); // Q5 réellement laissée vide
  });

  it("les points automatiques sont recalculables exactement à partir des réponses", () => {
    const rec = recoverMatiereFromSavedAnswers({ matiere, reponses: reponsesCompletes });
    // Q1 et Q2 justes, Q3 fausse
    expect(rec.qcmPoints).toBeGreaterThan(0);
    expect(rec.qcmPoints).toBe(rec.qcmMax * (2 / 3));
    expect(rec.recoverable).toBe(true);
  });

  it("une QRC répondue garde sa réponse et son état « à corriger » (aucun point automatique)", () => {
    const rec = recoverMatiereFromSavedAnswers({ matiere, reponses: reponsesCompletes });
    expect(rec.qrcPending).toEqual(["4"]);
    expect(rec.qrcManualPoints).toBe(0);
    expect(rec.qrcPendingCorrection).toBe(true);
    expect(rec.reponses["4"]).toBe("ma réponse QRC");
  });

  it("une QRC réellement vide vaut 0 et ne bloque pas", () => {
    const rec = recoverMatiereFromSavedAnswers({ matiere, reponses: reponsesCompletes });
    expect(rec.qrcEmpty).toEqual(["5"]);
    expect(rec.qrcPending).not.toContain("5");
  });

  it("une QRC déjà corrigée reprend exactement les points attribués, jamais recalculés", () => {
    const rec = recoverMatiereFromSavedAnswers({
      matiere,
      reponses: reponsesCompletes,
      correctionsIA: { "4": { validatedByAdmin: true, pointsObtenus: 1.5, explication: "ok" } },
    });
    expect(rec.qrcManualPoints).toBe(1.5);
    expect(rec.qrcPending).toHaveLength(0);
    expect(rec.qrcPendingCorrection).toBe(false);
  });

  it("aucune note artificielle à 0 : sans réponse, la finalisation est refusée", () => {
    const rec = recoverMatiereFromSavedAnswers({ matiere, reponses: {} });
    expect(rec.recoverable).toBe(false);
    expect(canFinalizeMatiere(rec)).toBe(false);
  });

  it("la matière n'est jamais considérée comme vide dès qu'une seule réponse existe", () => {
    const rec = recoverMatiereFromSavedAnswers({ matiere, reponses: { "1": ["A"] } });
    expect(rec.recoverable).toBe(true);
    expect(canFinalizeMatiere(rec)).toBe(true);
    expect(rec.scoreObtenu).toBeGreaterThan(0);
  });
});

describe("Quitter / revenir et coupure réseau", () => {
  beforeEach(() => {
    localStorage.clear();
    setAnswerSaveAuthToken("test-token", "apprenant-11");
    setAnswerSaveOwnership({ apprenantId: "apprenant-11", previewReadOnly: false });
  });
  afterEach(() => vi.restoreAllMocks());

  it("hors ligne : les réponses sont conservées localement et restaurées au retour", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const exercice = "EB1__t3p";
    enqueueAnswerSave({
      apprenant_id: "apprenant-11",
      exercice_id: exercice,
      exercice_type: "examen_blanc",
      reponses: reponsesCompletes,
    } as any);
    await new Promise((r) => setTimeout(r, 50));
    const restored = getPendingAnswers("apprenant-11", exercice) as Record<string, any>;
    expect(restored["1"]).toEqual(["A"]);
    expect(restored["4"]).toBe("ma réponse QRC");
    expect(Object.keys(restored)).toHaveLength(5);
  });
});

describe("Nouvel appui sur « Terminer » après panne", () => {
  it("reprend le même passage réel : une seule note, aucun doublon", async () => {
    const now = Date.now();
    const existing = [{
      apprenant_id: "A1", quiz_id: "EB1", quiz_type: "examen_blanc", matiere_id: "t3p",
      tentative: 1, completed_at: new Date(now - 4000).toISOString(),
      details: { questions: [], reponses: reponsesCompletes, correctionsIA: {} },
    }];
    const tentative = resolveIdempotentTentative({
      rows: existing as any, quizId: "EB1", quizType: "examen_blanc", matiereId: "t3p", desiredTentative: 2, now,
    });
    expect(tentative).toBe(1);

    let writes = 0;
    const key = buildFinalizationKey({ apprenantId: "A1", quizType: "examen_blanc", quizId: "EB1", matiereId: "t3p", tentative });
    const task = () => new Promise<boolean>((r) => setTimeout(() => { writes++; r(true); }, 10));
    await Promise.all([runFinalizationOnce(key, task), runFinalizationOnce(key, task), runFinalizationOnce(key, task)]);
    expect(writes).toBe(1);
  });

  it("le résultat reconstruit reste un seul passage logique avec une QRC à corriger une seule fois", () => {
    const base = {
      apprenant_id: "A1", quiz_type: "examen_blanc", quiz_id: "EB1", matiere_id: "t3p", matiere_nom: "A - T3P",
    };
    const passages = groupPassages([
      { ...base, tentative: 1, completed_at: "2026-09-18T18:00:00.000Z", details: { questions: [{ questionId: "4", type: "QRC", reponseEleve: "ma réponse QRC" }], reponses: { "4": "ma réponse QRC" }, correctionsIA: {} } },
      { ...base, tentative: 2, completed_at: "2026-09-18T18:00:00.500Z", details: { questions: [{ questionId: "4", type: "QRC", reponseEleve: "ma réponse QRC" }], reponses: { "4": "ma réponse QRC" }, correctionsIA: {} } },
    ] as any);
    expect(passages).toHaveLength(1);
    expect(getQrcToCorrect(passages[0])).toEqual(["4"]);
  });

  it("après votre correction, la QRC ne remonte plus jamais", () => {
    const base = {
      apprenant_id: "A1", quiz_type: "examen_blanc", quiz_id: "EB1", matiere_id: "t3p", matiere_nom: "A - T3P",
    };
    const passages = groupPassages([
      { ...base, tentative: 1, completed_at: "2026-09-18T18:00:00.000Z", details: { questions: [{ questionId: "4", type: "QRC", reponseEleve: "ma réponse QRC" }], reponses: { "4": "ma réponse QRC" }, correctionsIA: {} } },
      { ...base, tentative: 2, completed_at: "2026-09-18T18:00:00.500Z", details: { questions: [], reponses: {}, correctionsIA: { "4": { validatedByAdmin: true, pointsObtenus: 2 } } } },
    ] as any);
    expect(getQrcState(passages[0], 4)).toBe("validated");
    expect(getQrcToCorrect(passages[0])).toHaveLength(0);
  });
});
