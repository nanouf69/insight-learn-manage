import { describe, it, expect } from "vitest";
import { construireInventaire, eligible, score20, joursFeries, versCsv } from "@/lib/quizAvantExamenTaxi/inventaire";

const rows = [{ module_id: 11, module_data: { exercices: [{ id: 605, titre: "F", questions: [
  { id: 1, question_id: "u1", enonce: "Q un ?", choix: [{ lettre: "A", texte: "x", correct: true }, { lettre: "B", texte: "y" }] },
  { id: 2, type: "QRC", enonce: "Expliquez", choix: [] },
  { id: 3, enonce: "Sans clé", choix: [{ lettre: "A", texte: "x" }] },
] }, { id: 999, titre: "hors périmètre", questions: [{ id: 9, enonce: "z", choix: [{ lettre: "A", texte: "a", correct: true }] }] }] } },
{ module_id: 28, module_data: { exercices: [{ id: 700, titre: "F2", questions: [
  { id: 7, uid: "u7", enonce: "Q  UN ?", choix: [{ lettre: "B", texte: "y" }, { lettre: "A", texte: "x", correct: true }] }] }] } }];

describe("quiz avant examen TAXI — inventaire", () => {
  const inv = construireInventaire(rows);
  it("lit seulement les exercices du périmètre", () => expect(inv.map(i => i.cle)).toEqual(["u1", "11:605:2", "11:605:3", "u7"]));
  it("QRC exclue, QCM sans corrigé exclue, doublon exclu", () => {
    expect(inv.filter(eligible).map(i => i.cle)).toEqual(["u1"]);
    expect(inv[1].type).toBe("QRC"); expect(inv[2].sansCorrige).toBe(true); expect(inv[3].doublonDe).toBe("u1@11/605");
  });
  it("score /20 tout-ou-rien", () => {
    const q = [{ cle: "a", bonnes: ["A", "C"] }, { cle: "b", bonnes: ["B"] }];
    expect(score20(q, { a: ["C", "A"], b: ["B"] })).toBe(20);
    expect(score20(q, { a: ["A"], b: ["B"] })).toBe(10);
    expect(score20(q, { a: ["A", "C", "D"] })).toBe(0);
  });
  it("jours fériés mobiles calculés par année", () => {
    const d = (y: number, n: string) => joursFeries(y).find(j => j.nom === n)!.date;
    expect(d(2026, "Lundi de Pâques")).toBe("2026-04-06");
    expect(d(2026, "Ascension")).toBe("2026-05-14");
    expect(d(2026, "Lundi de Pentecôte")).toBe("2026-05-25");
    expect(d(2027, "Lundi de Pâques")).toBe("2027-03-29");
    expect(joursFeries(2027)).toHaveLength(11);
  });
  it("export CSV contient toutes les lignes", () => expect(versCsv(inv).split("\n")).toHaveLength(5));
});
