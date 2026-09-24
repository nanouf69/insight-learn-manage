import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  questionAvecCleFigee,
  scoreAffichePassageFige,
  exoIdDepuisArchive,
  type PassageFige,
} from "@/components/cours-en-ligne/passagesFiges";

const passage: PassageFige = {
  exercice_id: "module_5_exo_502",
  reponses: { "502-1": "A", "502-2": "C", "502-3": "B" },
  cle_figee: {
    "502-1": { choix: [{ lettre: "A", correct: true }, { lettre: "B", correct: false }], correctes: ["A"] },
    "502-2": { choix: [{ lettre: "A", correct: true }, { lettre: "C", correct: false }], correctes: ["A"] },
    "502-3": { choix: [{ lettre: "A", correct: false }, { lettre: "B", correct: true }], correctes: ["B"] },
  },
  score_bonnes: 2,
  nb_repondues: 3,
  nb_questions: 3,
};

const bonnes = (qs: any[], rep: Record<string, any>) =>
  qs.filter((q) => {
    const c = q.choix.filter((x: any) => x.correct).map((x: any) => x.lettre).sort();
    const s = [].concat(rep[`502-${q.id}`] ?? []).sort();
    return s.length && JSON.stringify(s) === JSON.stringify(c);
  }).length;

describe("Passages Bilan figés — affichage indépendant du contenu actuel", () => {
  it("le score affiché d'un passage figé égale le score archivé", () => {
    expect(scoreAffichePassageFige(passage)).toEqual({ bonnes: 2, total: 3 });
  });

  it("une correction fictive du contenu actuel ne change pas le score affiché", () => {
    // Contenu actuel « réparé » fictivement : Q2 devient C correcte
    const contenuActuel = [
      { id: 1, choix: [{ lettre: "A", correct: false }, { lettre: "B", correct: true }] },
      { id: 2, choix: [{ lettre: "A", correct: false }, { lettre: "C", correct: true }] },
      { id: 3, choix: [{ lettre: "A", correct: true }, { lettre: "B", correct: false }] },
    ];
    // Sans archive, le score recalculé changerait
    expect(bonnes(contenuActuel, passage.reponses)).toBe(1);
    // Avec archive, l'écran utilise la clé figée
    const affiches = contenuActuel.map((q) => questionAvecCleFigee(q, 502, passage));
    expect(bonnes(affiches, passage.reponses)).toBe(2);
    expect(affiches[1].choix).toEqual(passage.cle_figee["502-2"].choix);
  });

  it("sans archive, le comportement actuel est inchangé", () => {
    const q = { id: 1, choix: [{ lettre: "B", correct: true }] };
    expect(questionAvecCleFigee(q, 502, null)).toBe(q);
    expect(questionAvecCleFigee(q, 999, { ...passage, cle_figee: {} })).toBe(q);
  });

  it("identifiant d'exercice extrait de l'archive", () => {
    expect(exoIdDepuisArchive("module_5_exo_502")).toBe(502);
    expect(exoIdDepuisArchive("module_11_exo_602")).toBe(602);
  });

  it("l'écran lit l'archive en lecture seule et applique la clé figée", () => {
    const src = readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
    expect(src).toMatch(/from\("bilan_passages_figes"\)\s*\n\s*\.select\(/);
    expect(src).not.toMatch(/from\("bilan_passages_figes"\)[\s\S]{0,80}\.(insert|update|upsert|delete)\(/);
    expect(src).toContain("questionAvecCleFigee(qBrut, Number(exo.id), passageFigeExo)");
  });
});
