// @vitest-environment node
/**
 * CŒUR DES EXAMENS BLANCS — un passage = un identifiant unique et persistant.
 * Aucun de ces tests n'écrit, ne migre ni ne renumérote la moindre donnée.
 */
import { describe, expect, it } from "vitest";
import { isStoredExamSessionAfterReset, resolveExamPassage } from "../examens-blancs-utils";

const MATIERES = [
  { id: "t3p", nom: "A - T3P" },
  { id: "gestion", nom: "B - Gestion" },
  { id: "securite", nom: "C - Sécurité routière" },
  { id: "francais", nom: "D - Français" },
  { id: "anglais", nom: "E - Anglais" },
  { id: "reglementation_vtc", nom: "F - Réglementation VTC" },
  { id: "reglementation_vtc2", nom: "G - Réglementation VTC 2" },
];

const answer = (exercice_id: string, over: Record<string, any> = {}) => ({
  exercice_id,
  reponses: { "1": ["A"] },
  completed: false,
  tentative: 1,
  updated_at: "2026-09-21T10:00:00Z",
  ...over,
}) as any;

const result = (matiere_id: string, tentative: number, at = "2026-09-21T10:30:00Z") => ({
  matiere_id,
  matiere_nom: MATIERES.find((m) => m.id === matiere_id)?.nom,
  tentative,
  completed_at: at,
  created_at: at,
  score_obtenu: 12,
  score_max: 20,
});

const resolve = (over: Partial<Parameters<typeof resolveExamPassage>[0]> = {}) =>
  resolveExamPassage({ examId: "EB1", matieres: MATIERES, resultRows: [], savedRows: [], ...over } as any);

describe("Identité d'un passage d'examen blanc", () => {
  it("premier passage : toutes les matières partagent la tentative 1", () => {
    const p = resolve();
    expect(p.mode).toBe("new");
    expect(p.tentative).toBe(1);
    expect(p.exerciceIds.francais).toBe("EB1__francais");
    expect(Object.values(p.exerciceIds)).toHaveLength(7);
  });

  it("reprise (F5, déconnexion, retour) : même passage, mêmes identifiants", () => {
    const savedRows = [answer("EB1__t3p"), answer("EB1__francais")];
    const resultRows = [result("t3p", 1)];
    const first = resolve({ savedRows, resultRows });
    const second = resolve({ savedRows, resultRows });
    expect(first.mode).toBe("resume");
    expect(first.tentative).toBe(1);
    expect(first.exerciceIds.francais).toBe("EB1__francais");
    expect(second.exerciceIds).toEqual(first.exerciceIds);
  });

  it("reprise : une matière pas encore commencée garde la clé du MÊME passage", () => {
    const p = resolve({
      savedRows: [answer("EB1__t3p__t2", { tentative: 2 })],
      resultRows: [],
    });
    expect(p.mode).toBe("resume");
    expect(p.tentative).toBe(2);
    expect(p.exerciceIds.francais).toBe("EB1__francais__t2");
    expect(p.exerciceIds.anglais).toBe("EB1__anglais__t2");
  });

  it("refaire l'examen : nouveau passage, jamais l'ancien", () => {
    const savedRows = MATIERES.map((m) => answer(`EB1__${m.id}`, { completed: true }));
    const resultRows = MATIERES.map((m) => result(m.id, 1));
    const p = resolve({ savedRows, resultRows, forceRetake: true });
    expect(p.mode).toBe("new");
    expect(p.tentative).toBe(2);
    MATIERES.forEach((m) => expect(p.exerciceIds[m.id]).toBe(`EB1__${m.id}__t2`));
  });

  it("une tentative terminée n'est JAMAIS réutilisée, même en reprise", () => {
    const savedRows = [
      ...MATIERES.map((m) => answer(`EB1__${m.id}`, { completed: true })),
      answer("EB1__francais__t2", { tentative: 2, completed: true }),
    ];
    const resultRows = [...MATIERES.map((m) => result(m.id, 1)), result("francais", 2)];
    const p = resolve({ savedRows, resultRows, forceRetake: true });
    expect(p.tentative).toBe(3);
    expect(Object.values(p.exerciceIds).every((id) => !savedRows.some((r) => r.exercice_id === id))).toBe(true);
  });

  it("un passage partiellement terminé se reprend sans toucher aux matières finalisées", () => {
    const savedRows = [
      answer("EB1__t3p__t2", { tentative: 2, completed: true }),
      answer("EB1__gestion__t2", { tentative: 2 }),
      answer("EB1__t3p", { completed: true }),
    ];
    const resultRows = [result("t3p", 1), result("t3p", 2)];
    const p = resolve({ savedRows, resultRows });
    expect(p.mode).toBe("resume");
    expect(p.tentative).toBe(2);
    expect(p.completedMatiereIds).toContain("t3p");
    expect(p.exerciceIds.gestion).toBe("EB1__gestion__t2");
    expect(p.exerciceIds.francais).toBe("EB1__francais__t2");
  });

  it("le numéro d'un nouveau passage n'entre jamais en collision avec un résultat existant", () => {
    const resultRows = [result("t3p", 1), result("t3p", 4)];
    const savedRows = [answer("EB1__t3p", { completed: true }), answer("EB1__t3p__t4", { tentative: 4, completed: true })];
    const p = resolve({ savedRows, resultRows, forceRetake: true });
    expect(p.tentative).toBe(5);
  });

  it("toutes les matières d'un même passage portent le même numéro", () => {
    const p = resolve({
      savedRows: [answer("EB1__t3p__t3", { tentative: 3, completed: true })],
      resultRows: [result("t3p", 3)],
      forceRetake: true,
    });
    const suffixes = new Set(Object.values(p.exerciceIds).map((id) => id.split("__").slice(2).join("__")));
    expect(suffixes).toEqual(new Set([`t${p.tentative}`]));
  });
});

describe("Remise à zéro administrative — reprise navigateur", () => {
  const resetAt = new Date("2026-09-23T14:51:22.727Z").getTime();

  it("refuse une ancienne session EB1 après F5 ou reconnexion", () => {
    expect(isStoredExamSessionAfterReset({
      examenId: "EB1",
      examStartTime: new Date("2026-09-23T14:45:00Z").getTime(),
    }, "EB1", resetAt)).toBe(false);
  });

  it("accepte uniquement une nouvelle session EB1 créée après le reset", () => {
    expect(isStoredExamSessionAfterReset({
      examenId: "EB1",
      examStartTime: new Date("2026-09-23T15:00:00Z").getTime(),
    }, "EB1", resetAt)).toBe(true);
  });

  it("ne mélange jamais les examens", () => {
    expect(isStoredExamSessionAfterReset({
      examenId: "EB2",
      examStartTime: new Date("2026-09-23T15:00:00Z").getTime(),
    }, "EB1", resetAt)).toBe(false);
  });
});
