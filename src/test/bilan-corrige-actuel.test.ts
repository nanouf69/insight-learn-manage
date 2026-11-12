import { describe, it, expect } from "vitest";
import { projeterCopie, projeterQuestion, mapperOptions, BILAN_CORRIGE_ACTUEL_ACTIF, type LigneLue } from "@/lib/bilanCorrigeActuel";
const ch = (k: string[], ...t: string[]) => t.map((texte, i) => ({ lettre: "ABCDE"[i], texte, correct: k.includes("ABCDE"[i]) }));
const l = (p: Partial<LigneLue> & { frozen: any }): LigneLue => ({ uid: "u1", cle: "502-18", current: p.frozen, matches: 1, submitted: ["A"], ...p } as LigneLue);
const Q18 = { uid: "u1", type: "QCM", enonce: "Q18", choix: ch(["A"], "x", "y", "z") };

describe("corrigé actuel générique", () => {
  it("non activé tant que la lecture serveur n'est pas installée", () => expect(BILAN_CORRIGE_ACTUEL_ACTIF).toBe(false));
  it("Q18 A→A+C : réponse remise A devient fausse, note recalculée distincte", () => {
    const p = projeterCopie([l({ frozen: Q18, current: { ...Q18, choix: ch(["A", "C"], "x", "y", "z") } })]);
    expect(p.questions[0].correct).toEqual(["A", "C"]);
    expect(p.noteRecalculee).toEqual({ juste: 0, total: 1, sur20: 0 });
    expect(p.fausses).toHaveLength(1);
  });
  it("A+C remis devient juste après le passage du corrigé à A+C", () => {
    expect(projeterQuestion(l({ frozen: Q18, submitted: ["C", "A"], current: { ...Q18, choix: ch(["A", "C"], "x", "y", "z") } })).submittedJuste).toBe(true);
  });
  it("options réordonnées : corrigé ramené aux lettres de la copie par le texte", () => {
    const q = projeterQuestion(l({ frozen: Q18, submitted: ["B"], current: { ...Q18, choix: ch(["A"], "y", "x", "z") } }));
    expect(q.correct).toEqual(["B"]); expect(q.submittedJuste).toBe(true);
  });
  it("Q71 Oui→Non : clé actuelle appliquée", () => {
    const f = { uid: "u1", type: "QCM", enonce: "camion", choix: ch(["A"], "Oui", "Non") };
    const q = projeterQuestion(l({ frozen: f, submitted: ["A"], current: { ...f, choix: ch(["B"], "Oui", "Non") } }));
    expect(q.correct).toEqual(["B"]); expect(q.submittedJuste).toBe(false);
  });
  it("énoncé modifié sous même identité : contenu actuel affiché", () => {
    expect(projeterQuestion(l({ frozen: Q18, current: { ...Q18, enonce: "Q18 corrigée" } })).enonce).toBe("Q18 corrigée");
  });
  it("texte d'option réécrit, ajout ou retrait d'option : non prouvé, jamais deviné", () => {
    expect(projeterQuestion(l({ frozen: Q18, current: { ...Q18, choix: ch(["A"], "x2", "y", "z") } })).statut).toBe("options_non_prouvees");
    expect(projeterQuestion(l({ frozen: Q18, current: { ...Q18, choix: ch(["A"], "x", "y", "z", "w") } })).statut).toBe("options_non_prouvees");
    expect(mapperOptions(ch([], "x", "x"), ch([], "x", "x"))).toBeNull();
  });
  it("supprimée, remplacée (autre uid), doublon, sans uid : exclues, note recalculée incomplète (null, jamais 0)", () => {
    const p = projeterCopie([l({ frozen: Q18, matches: 0, current: null }), l({ frozen: Q18, current: { ...Q18, uid: "u2" } }), l({ frozen: Q18, matches: 2 }), l({ frozen: Q18, uid: null })]);
    expect(p.questions.map(q => q.statut)).toEqual(["supprimee", "ambigue", "ambigue", "sans_identite"]);
    expect(p.noteRecalculee).toBeNull(); expect(p.nonRapprochees).toBe(4);
  });
  it("QRC : à revérifier, pas de note inventée", () => {
    const f = { uid: "u1", type: "QRC", enonce: "Définir" };
    const p = projeterCopie([l({ frozen: f, submitted: "texte" })]);
    expect(p.questions[0].statut).toBe("qrc_a_reverifier"); expect(p.noteRecalculee).toBeNull(); expect(p.aReverifier).toBe(1);
  });
  it("dernier choix d'entraînement : progression seulement, jamais la note", () => {
    const p = projeterCopie([l({ frozen: Q18, submitted: ["B"], practice: ["A"] })]);
    expect(p.fausses).toHaveLength(0); expect(p.noteRecalculee?.juste).toBe(0);
  });
  it("entraînement vide explicite reste faux", () => {
    expect(projeterCopie([l({ frozen: Q18, practice: [] })]).fausses).toHaveLength(1);
  });
  it("ne modifie pas les objets lus (historique intact)", () => {
    const row = l({ frozen: Q18, current: { ...Q18, choix: ch(["C"], "x", "y", "z") } }); const before = JSON.stringify(row);
    projeterCopie([row]); expect(JSON.stringify(row)).toBe(before);
  });
});
