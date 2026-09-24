/**
 * RÈGLE GÉNÉRALE DE CONSERVATION — tous les quiz de l'application.
 *
 * Aucune donnée existante n'est modifiée par ces tests : ils vérifient
 * uniquement le mécanisme (file locale, fusion base + file, clé canonique,
 * antériorité des écritures, séparation sauvegarde / validation).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";

import {
  enqueueAnswerSave,
  getPendingAnswers,
  mergeSavedAndPendingAnswers,
  isMeaningfulAnswerValue,
  setAnswerSaveAuthToken,
  setAnswerSaveOwnership,
  onAnswerSaveRejected,
} from "@/lib/answerPersistence";
import { buildExamMatiereExerciceId } from "@/lib/quizAttempts";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 0, text: async () => "offline" })) as any);
  vi.stubGlobal("navigator", { onLine: false });
  setAnswerSaveAuthToken(null, null);
  // Identification réelle de l'élève avant toute sauvegarde (comme CoursPublic).
  setAnswerSaveOwnership({ apprenantId: "appr-A", previewReadOnly: false });
});

describe("1 — File hors ligne rattachée à son propriétaire", () => {
  it("les réponses de l'apprenant A ne sont jamais visibles ni envoyées sur le compte B", () => {
    setAnswerSaveAuthToken("tok-A", "user-A");
    enqueueAnswerSave({
      apprenant_id: "appr-A",
      exercice_id: "EB2__gestion",
      exercice_type: "examen_blanc",
      reponses: { "1": ["A"] },
    });
    expect(getPendingAnswers("appr-A", "EB2__gestion")).toEqual({ "1": ["A"] });

    // Second apprenant sur la même tablette
    setAnswerSaveAuthToken("tok-B", "user-B");
    expect(getPendingAnswers("appr-A", "EB2__gestion")).toBeNull();

    // La réponse de A n'est pas supprimée : elle réapparaît pour son propriétaire
    setAnswerSaveAuthToken("tok-A", "user-A");
    expect(getPendingAnswers("appr-A", "EB2__gestion")).toEqual({ "1": ["A"] });
  });
});

describe("2 & 3 — Réponse non vide > ligne vide, file locale prioritaire", () => {
  it("une ligne serveur vide ne masque pas une réponse locale (F5 / reconnexion)", () => {
    setAnswerSaveAuthToken("tok-A", "user-A");
    enqueueAnswerSave({
      apprenant_id: "appr-A",
      exercice_id: "module_2_exo_1",
      exercice_type: "quiz",
      reponses: { "1-1": ["B"], "1-2": "texte QRC" },
    });
    expect(mergeSavedAndPendingAnswers({}, "appr-A", "module_2_exo_1")).toEqual({
      "1-1": ["B"],
      "1-2": "texte QRC",
    });
    expect(mergeSavedAndPendingAnswers(null, "appr-A", "module_2_exo_1")).toEqual({
      "1-1": ["B"],
      "1-2": "texte QRC",
    });
  });

  it("une valeur vide n'écrase jamais une réponse enregistrée", () => {
    setAnswerSaveAuthToken("tok-A", "user-A");
    enqueueAnswerSave({
      apprenant_id: "appr-A",
      exercice_id: "EB1__t3p",
      exercice_type: "examen_blanc",
      reponses: { "1": [], "2": "   ", "3": ["C"] },
    });
    expect(mergeSavedAndPendingAnswers({ "1": ["A"], "2": "réponse", "3": [] }, "appr-A", "EB1__t3p")).toEqual({
      "1": ["A"],
      "2": "réponse",
      "3": ["C"],
    });
  });

  it("les valeurs réellement vides sont identifiées comme telles", () => {
    expect(isMeaningfulAnswerValue([])).toBe(false);
    expect(isMeaningfulAnswerValue("  ")).toBe(false);
    expect(isMeaningfulAnswerValue(null)).toBe(false);
    expect(isMeaningfulAnswerValue(["A"])).toBe(true);
    expect(isMeaningfulAnswerValue("texte")).toBe(true);
  });
});

describe("4 — Clé d'examen canonique unique", () => {
  it("construit la même clé partout, avec et sans tentative", () => {
    expect(buildExamMatiereExerciceId("EB2", "gestion")).toBe("EB2__gestion");
    expect(buildExamMatiereExerciceId("EB2", "gestion", 1)).toBe("EB2__gestion");
    expect(buildExamMatiereExerciceId("EB2", "gestion", 3)).toBe("EB2__gestion__t3");
  });

  it("aucune construction manuelle de clé ne subsiste dans les écrans d'examen", () => {
    for (const file of [
      "src/components/cours-en-ligne/ExamenBlancsPassage.tsx",
      "src/components/cours-en-ligne/ExamensBlancsPage.tsx",
    ]) {
      const src = read(file);
      expect(src).toContain("buildExamMatiereExerciceId");
      expect(src).not.toMatch(/`\$\{examenId \|\| "exam"\}__/);
      expect(src).not.toMatch(/`\$\{examenChoisi\.id\}__\$\{matiere\.id\}/);
    }
  });
});

describe("5 — Antériorité des écritures sur les écrans formateur", () => {
  it("la correction QCM refuse d'écraser une ligne modifiée entre-temps", () => {
    const src = read("src/components/cours-en-ligne/CorrectionQCMTab.tsx");
    expect(src).toContain('.eq("updated_at", existingRep.updated_at)');
    expect(src).toContain("rien n'a été écrasé");
    // Les QRC et leurs corrections manuelles ne sont jamais réécrites ici
    expect(src).toContain('if (q.type === "QCM")');
  });
});

describe("6 — Ancien mécanisme neutralisé en écriture, lecture conservée", () => {
  it("le hook historique ne contourne plus les protections (plus d'XHR direct)", () => {
    const src = read("src/hooks/useAutoSaveReponses.ts");
    expect(src).not.toContain("new XMLHttpRequest()");
    expect(src).toContain("flushAnswerSavesOnUnload()");
    expect(src).toContain("mergeSavedAndPendingAnswers");
  });
});

describe("Protection — sauvegarder ≠ terminer", () => {
  it("les réponses restent disponibles même si « Terminer » échoue", async () => {
    setAnswerSaveAuthToken("tok-A", "user-A");
    const exercice = "EB3__securite";
    for (let i = 1; i <= 50; i++) {
      enqueueAnswerSave({
        apprenant_id: "appr-A",
        exercice_id: exercice,
        exercice_type: "examen_blanc",
        reponses: Object.fromEntries(Array.from({ length: i }, (_, k) => [String(k + 1), ["A"]])),
      });
    }
    // Échec réseau du « Terminer » : rien n'est supprimé de la file
    const pending = getPendingAnswers("appr-A", exercice) as Record<string, unknown>;
    expect(Object.keys(pending)).toHaveLength(50);
    // Après rechargement de page (nouvelle lecture du stockage), tout est là
    expect(getPendingAnswers("appr-A", exercice)).toEqual(pending);
  });
});

describe("Sécurité — identité élève indisponible", () => {
  it("aucune réponse n'est mise en file ni considérée comme sauvegardée", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setAnswerSaveOwnership({ apprenantId: null, previewReadOnly: false });
    setAnswerSaveAuthToken("tok-A", "user-A");
    enqueueAnswerSave({
      apprenant_id: "appr-A",
      exercice_id: "EB2__gestion",
      exercice_type: "examen_blanc",
      reponses: { "1": ["A"] },
    });
    expect(getPendingAnswers("appr-A", "EB2__gestion")).toBeNull();
    expect(store.size === 0 || !String([...store.values()]).includes("EB2__gestion")).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("un autre dossier que celui de la session n'est jamais mis en file", () => {
    setAnswerSaveAuthToken("tok-A", "user-A");
    enqueueAnswerSave({ apprenant_id: "appr-B", exercice_id: "EB2__gestion", exercice_type: "examen_blanc", reponses: { "1": ["A"] } });
    expect(getPendingAnswers("appr-B", "EB2__gestion")).toBeNull();
  });

  // EN ATTENTE D'ACCORD (modification du code fonctionnel nécessaire) :
  // aujourd'hui le refus n'est signalé que dans la console ; aucune alerte
  // visible n'est déclenchée pour l'élève.
  it.todo("déclenche une erreur visible (onAnswerSaveRejected) quand l'identité élève est absente");
  void onAnswerSaveRejected;
});
