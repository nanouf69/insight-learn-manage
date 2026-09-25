// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { transformSync } from "esbuild";

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
  setAnswerSaveOwnership,
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

  it("une matière affichée sans questions n'est jamais considérée comme terminable", () => {
    const src = read(SRC);
    expect(src).toContain("const allAnswered = questionsSafe.length > 0 && questionsSafe.every");
    expect(src).toContain("if (questionsSafe.length === 0) {");
    expect(src).toContain("Le contenu de cette matière n'est pas chargé. La matière reste ouverte");
  });

  it("1b — le noyau exige les identifiants exacts du snapshot côté serveur avant de clôturer (tolérant à la mise en page)", () => {
    const src = read(SRC).replace(/\s+/g, "");
    expect(src).toContain('supabase.from("exam_attempts_v2").select("snapshot")');
    expect(src).toContain('supabase.from("answer_state").select("question_id")');
    expect(src).toContain("requis.every");
    expect(src).toContain("clotureForcee?idsSnapshot.filter");
    expect(src).toContain("!confirmation?.contenuConforme||!confirmation.toutesConfirmees");
  });

  it("les réponses partielles sont rechargées au retour (fusion base + file locale)", () => {
    const src = read(SRC);
    expect(src).toContain("mergeSavedAndPendingAnswers(rawReponses as any, apprenantId, exerciceKey)");
  });
});

// 1a — test COMPORTEMENTAL : on exécute la vraie fonction de contrôle serveur
// extraite de l'écran de passage (aucune copie de la logique), avec un
// serveur simulé, puis la règle de clôture réelle (contenuConforme && toutesConfirmees).
describe("1a — clôture autorisée seulement si le serveur possède toutes les réponses", () => {
  const chargerControle = () => {
    const src = read(SRC);
    const debut = src.indexOf("const lireConfirmationNoyau = async () => {");
    const fin = src.indexOf("let confirmation = await lireConfirmationNoyau();");
    expect(debut).toBeGreaterThan(0);
    expect(fin).toBeGreaterThan(debut);
    const js = transformSync(src.slice(debut, fin), { loader: "ts" }).code;
    // La fonction extraite lit deux éléments de la portée englobante :
    // `clotureForcee` (clôture normale vs forcée) et `idsSaisis` (réponses
    // réellement saisies par l'élève). On les fournit comme paramètres.
    return new Function(
      "supabase", "attemptId", "matiere", "attendues", "clotureForcee", "idsSaisis",
      `${js}; return lireConfirmationNoyau;`,
    );
  };
  const serveur = (nbQuestions: number, nbReponses: number) => {
    const snapshot = { questions: Array.from({ length: nbQuestions }, (_, i) => ({ id: `q${i + 1}`, matiere: "t3p" })) };
    const reponses = Array.from({ length: nbReponses }, (_, i) => ({ question_id: `q${i + 1}` }));
    return {
      from: (table: string) => ({
        select: () => ({
          eq: () =>
            table === "exam_attempts_v2"
              ? { maybeSingle: async () => ({ data: { snapshot }, error: null }) }
              : Promise.resolve({ data: reponses, error: null }),
        }),
      }),
    };
  };
  const clotureAutorisee = async (nbReponses: number) => {
    const lire = chargerControle()(serveur(15, nbReponses), "att-1", { id: "t3p" }, 15, false, new Set<string>());
    const c = await lire();
    return Boolean(c?.contenuConforme && c?.toutesConfirmees);
  };

  it("0/15 réponses serveur → clôture refusée", async () => {
    expect(await clotureAutorisee(0)).toBe(false);
  });
  it("14/15 réponses serveur → clôture refusée", async () => {
    expect(await clotureAutorisee(14)).toBe(false);
  });
  it("15/15 réponses serveur → clôture autorisée", async () => {
    expect(await clotureAutorisee(15)).toBe(true);
  });
  it("erreur de lecture serveur → aucune confirmation (jamais interprétée comme complète)", async () => {
    const enPanne = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: "panne" } }), then: (r: any) => r({ data: null, error: { message: "panne" } }) }) }) }) };
    const c = await chargerControle()(enPanne, "att-1", { id: "t3p" }, 15, false, new Set<string>())();
    expect(Boolean(c?.contenuConforme && c?.toutesConfirmees)).toBe(false);
  });

  // Clôture forcée (interruption / temps écoulé) : seules les réponses
  // RÉELLEMENT saisies doivent être confirmées par le serveur. Une question
  // laissée vide n'est jamais exigée (elle vaudra 0 côté serveur).
  const clotureForceeAutorisee = async (idsSaisis: string[], idsConfirmes: number) => {
    const lire = chargerControle()(serveur(15, idsConfirmes), "att-1", { id: "t3p" }, 15, true, new Set(idsSaisis));
    const c = await lire();
    return Boolean(c?.contenuConforme && c?.toutesConfirmees);
  };

  it("clôture forcée : réponse saisie mais non confirmée serveur → clôture refusée", async () => {
    // q15 saisie par l'élève mais le serveur n'a confirmé que q1..q14
    expect(await clotureForceeAutorisee(["q15"], 14)).toBe(false);
  });
  it("clôture forcée : question laissée vide → ne bloque pas la clôture (vaut 0)", async () => {
    // q1..q14 saisies et confirmées, q15 laissée vide : clôture autorisée
    const saisies = Array.from({ length: 14 }, (_, i) => `q${i + 1}`);
    expect(await clotureForceeAutorisee(saisies, 14)).toBe(true);
  });
});

describe("15 réponses sur 20, hors ligne puis retour", () => {
  beforeEach(() => {
    localStorage.clear();
    setAnswerSaveAuthToken("test-token", "auth-test");
    setAnswerSaveOwnership({ apprenantId: "auth-test", previewReadOnly: false });
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
