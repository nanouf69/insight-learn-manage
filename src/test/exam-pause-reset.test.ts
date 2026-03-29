/**
 * TDD — BUG #8: La pause pendant les examens remet à 0 et n'enregistre pas
 *
 * Teste le VRAI code: persistExamSession exporté depuis examens-blancs-utils.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { persistExamSession } from "@/components/cours-en-ligne/examens-blancs-utils";

// Mock sessionStorage
const sessionStorageData: Record<string, string> = {};
Object.defineProperty(window, "sessionStorage", {
  value: {
    getItem: vi.fn((key: string) => sessionStorageData[key] || null),
    setItem: vi.fn((key: string, val: string) => {
      sessionStorageData[key] = val;
    }),
    removeItem: vi.fn((key: string) => {
      delete sessionStorageData[key];
    }),
    clear: vi.fn(() => {
      Object.keys(sessionStorageData).forEach((k) => delete sessionStorageData[k]);
    }),
  },
  writable: true,
});

beforeEach(() => {
  Object.keys(sessionStorageData).forEach((k) => delete sessionStorageData[k]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BUG #8 — Pause remet à 0 et n'enregistre pas (vrai code)", () => {
  const EXAM_SESSION_KEY = "exam_session_apprenant-001";

  it("persistExamSession sauvegarde currentReponses dans sessionStorage", () => {
    const reponses = { 1: ["A"], 2: ["B", "C"], 3: "texte libre" };

    persistExamSession(EXAM_SESSION_KEY, "examen", "examen-t3p-6", 2, Date.now(), [], reponses as any, 3);

    const saved = JSON.parse(sessionStorage.getItem(EXAM_SESSION_KEY)!);
    expect(saved).toHaveProperty("currentReponses");
    expect(saved.currentReponses).toEqual(reponses);
  });

  it("persistExamSession sauvegarde questionIndex dans sessionStorage", () => {
    persistExamSession(EXAM_SESSION_KEY, "examen", "examen-t3p-6", 0, Date.now(), [], {}, 5);

    const saved = JSON.parse(sessionStorage.getItem(EXAM_SESSION_KEY)!);
    expect(saved).toHaveProperty("questionIndex");
    expect(saved.questionIndex).toBe(5);
  });

  it("persistExamSession met des valeurs par défaut pour currentReponses et questionIndex", () => {
    // Appel sans currentReponses ni questionIndex
    persistExamSession(EXAM_SESSION_KEY, "examen", "examen-t3p-6", 0, Date.now());

    const saved = JSON.parse(sessionStorage.getItem(EXAM_SESSION_KEY)!);
    expect(saved.currentReponses).toEqual({});
    expect(saved.questionIndex).toBe(0);
  });

  it("persistExamSession supprime la session quand phase != examen", () => {
    persistExamSession(EXAM_SESSION_KEY, "examen", "examen-t3p-6", 0, Date.now());
    expect(sessionStorage.getItem(EXAM_SESSION_KEY)).not.toBeNull();

    persistExamSession(EXAM_SESSION_KEY, "resultats", null, 0, Date.now());
    expect(sessionStorage.getItem(EXAM_SESSION_KEY)).toBeNull();
  });

  it("persistExamSession conserve examStartTime et resultats", () => {
    const startTime = Date.now() - 300000;
    const resultats = [{ matiereId: "A", nomMatiere: "Matière A", noteObtenue: 15, maxPoints: 20 }];

    persistExamSession(EXAM_SESSION_KEY, "examen", "examen-t3p-6", 1, startTime, resultats as any, { 1: ["B"] }, 2);

    const saved = JSON.parse(sessionStorage.getItem(EXAM_SESSION_KEY)!);
    expect(saved.examStartTime).toBe(startTime);
    expect(saved.resultats).toEqual(resultats);
    expect(saved.matiereIndex).toBe(1);
  });
});
