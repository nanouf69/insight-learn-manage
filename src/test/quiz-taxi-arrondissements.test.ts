import { describe, it, expect } from "vitest";
import { SOURCES, construireInventaire } from "@/lib/quizAvantExamenTaxi/inventaire";
import { construirePropositions } from "@/lib/quizAvantExamenTaxi/propositionsArrondissements";

const q = (id: string, voie: string, bonne: string, autre: string) => ({ id, type: "QCM", enonce: `Dans quel arrondissement de Lyon se trouve ${voie} ?`,
  choix: [{ lettre: "A", texte: bonne, correct: true }, { lettre: "B", texte: autre, correct: false }] });

describe("Quiz avant examen TAXI — correction 16/11", () => {
  it("exclut entièrement le contrôle de connaissances 13/13100", () => {
    expect(SOURCES.some((s) => s.module === 13 || s.exercice === 13100)).toBe(false);
  });
  it("rattache seulement d'après les corrigés existants, vraies et fausses d'autres arrondissements", () => {
    const rows = [{ module_id: 7, module_data: { exercices: [{ id: 7013, titre: "Places", questions: [
      q("1", "la Place Bellecour", "2ème arrondissement", "1er arrondissement"),
      q("2", "la Place des Terreaux", "1er arrondissement", "2ème arrondissement")] }] } }];
    const { propositions, lacunes } = construirePropositions(construireInventaire(rows));
    const p2 = propositions.find((p) => p.arrondissement === 2 && p.categorie === "places")!;
    expect(p2.enonce).toBe("Cochez toutes les places situées dans le 2e arrondissement de Lyon.");
    expect(p2.choix.filter((c) => c.correct).map((c) => c.texte)).toEqual(["Place Bellecour"]);
    expect(p2.choix.filter((c) => !c.correct).map((c) => c.texte)).toEqual(["Place des Terreaux"]);
    expect(lacunes.some((l) => l.arrondissement === 3 && l.categorie === "places")).toBe(true);
  });
});
