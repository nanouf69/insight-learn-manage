// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

import {
  enqueueAnswerSave,
  getPendingAnswers,
  getPendingAnswerSaves,
  setAnswerSaveAuthToken,
} from "@/lib/answerPersistence";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf-8");
const SRC = "src/components/cours-en-ligne/ExamenBlancsPassage.tsx";

describe("Réponse enregistrée ≠ matière terminée", () => {
  it("la saisie d'une réponse déclenche l'enregistrement, indépendamment du bouton Terminer", () => {
    const src = read(SRC);
    // Chaque changement QCM/QRC persiste immédiatement
    expect(src).toContain("const handleQCMChange");
    expect(src).toContain("const handleQRCChange");
    const qcm = src.slice(src.indexOf("const handleQCMChange"), src.indexOf("const handleQRCChange"));
    expect(qcm).toContain("persistReponses(next)");
    const qrc = src.slice(src.indexOf("const handleQRCChange"), src.indexOf("const isQuestionAnswered"));
    expect(qrc).toContain("persistReponses(next)");
    // La persistance met en file de façon synchrone (pas de dépendance au bouton)
    expect(src).toContain("enqueueAnswerSave({");
  });

  it("le blocage « toutes les questions » sort avant toute écriture de résultat, sans toucher aux réponses", () => {
    const src = read(SRC);
    const fn = src.slice(src.indexOf("const handleTerminer"), src.indexOf("const handleTerminer") + 1600);
    expect(fn).toContain("if (!allAnswered) {");
    // le garde-fou se termine par un simple return (aucune suppression / aucun résultat)
    expect(fn).toMatch(/if \(!allAnswered\) \{[\s\S]*?\n      return;\n    \}/);
    const guard = fn.slice(0, fn.indexOf("return;"));
    expect(guard).not.toContain("setReponses");
    expect(guard).not.toContain("onTerminer");
    expect(guard).not.toContain("upsert");
  });

  it("les réponses partielles sont rechargées au retour (fusion base + file locale)", () => {
    const src = read(SRC);
    expect(src).toContain("getPendingAnswers(apprenantId, exerciceKey)");
    expect(src).toContain("...rawReponses, ...(pending ?? {})");
  });
});

describe("15 réponses sur 20, hors ligne puis retour", () => {
  beforeEach(() => {
    localStorage.clear();
    setAnswerSaveAuthToken("test-token", "auth-test");
  });
  afterEach(() => vi.restoreAllMocks());

  it("conserve les 15 réponses hors ligne et les restitue après fermeture du navigateur", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const apprenant = "auth-test";
    const exercice = "EB99TEST__matiere";
    const reponses: Record<string, any> = {};
    for (let i = 1; i <= 15; i++) {
      reponses[String(i)] = i % 2 === 0 ? ["A"] : ["B"];
      enqueueAnswerSave({
        apprenant_id: apprenant,
        exercice_id: exercice,
        exercice_type: "examen_blanc",
        reponses: { ...reponses },
      });
    }
    await new Promise((r) => setTimeout(r, 50));

    const restored = getPendingAnswers(apprenant, exercice) as Record<string, any>;
    expect(Object.keys(restored ?? {})).toHaveLength(15);
    expect(restored["15"]).toEqual(["B"]);
    // Q16 à Q20 restent simplement à faire
    expect(restored["16"]).toBeUndefined();
    // Rien n'est perdu : la file reste remplie tant que le serveur n'a pas confirmé
    expect(getPendingAnswerSaves()).toBeGreaterThan(0);
  });
});
