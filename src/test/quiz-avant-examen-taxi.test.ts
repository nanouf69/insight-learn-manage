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

import { marquerDoublons } from "@/lib/quizAvantExamenTaxi/inventaire";
import { bilan, creer, ecrire, lire, ordonner, repondre } from "@/lib/quizAvantExamenTaxi/tentatives";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

describe("quiz avant examen TAXI — doublons, conflits, IDs", () => {
  const base = construireInventaire(rows);
  it("doublon au même corrigé fusionné avec source listée", () => expect(base[0].sourcesFusionnees).toEqual(["u7@28/700"]));
  it("corrigés différents = conflit, aucune version exclue en silence ni notée", () => {
    const [a, b] = [base[0], { ...base[3], doublonDe: null, sourcesFusionnees: [], cle: "u9", choix: [{ lettre: "A", texte: "x", correct: false }, { lettre: "B", texte: "y", correct: true }], bonnes: ["B"] }];
    const r = marquerDoublons([{ ...a, sourcesFusionnees: [] }, b]);
    expect(r.every(x => x.conflitAvec.length === 1 && !x.doublonDe)).toBe(true);
    expect(r.filter(eligible)).toHaveLength(0);
  });
  it("ID d'origine répété : clé suffixée stable et signalée", () => {
    const a = { ...base[1], empreinteContenu: "aaaa" }, b = { ...base[1], enonce: "autre", empreinteContenu: "bbbb" };
    const r1 = marquerDoublons([a, b]), r2 = marquerDoublons([b, a]);
    expect(r1.map(x => x.cle)).toEqual(["11:605:2#haaaa", "11:605:2#hbbbb"]);
    expect(r2.map(x => x.cle).sort()).toEqual(r1.map(x => x.cle)); expect(r1.every(x => x.idCollision)).toBe(true);
  });
  it("jour férié daté signalé", () => {
    const r = construireInventaire([{ module_id: 9, module_data: { exercices: [{ id: 203, questions: [
      { id: 1, enonce: "Le lundi de Pentecôte 2026 est-il férié ?", choix: [{ lettre: "A", texte: "Oui", correct: true }] },
      { id: 2, enonce: "Un jour férié ouvre-t-il droit à majoration ?", choix: [{ lettre: "A", texte: "Oui", correct: true }] }] }] } }]);
    expect(r.map(x => x.ferieFige)).toEqual([true, false]);
  });
});

describe("quiz avant examen TAXI — tentatives", () => {
  const q1 = { ...construireInventaire(rows)[0] };
  const q2 = { ...q1, cle: "k2", theme: "national" as const, bonnes: ["A"], empreinteContenu: "e2" };
  const inv = new Map([[q1.cle, q1], [q2.cle, q2]]);
  it("ordre fixe par thème, sans tirage", () => {
    const loc = { ...q1, cle: "L", theme: "local" as const };
    expect(ordonner([loc, q1, q2]).map(x => x.cle)).toEqual([q1.cle, "k2", "L"]);
  });
  it("sauvegarde relue, reprise, tentatives isolées et par compte", () => {
    const st = mem();
    let t1 = creer([], [q1.cle, "k2"], "toutes", null); t1 = repondre(t1, q1, ["A"]); ecrire(st, "admin1", t1);
    const t2 = creer(lire(st, "admin1"), [q1.cle], "erreurs", t1.id); ecrire(st, "admin1", t2);
    const l = lire(st, "admin1");
    expect(l.map(x => x.numero)).toEqual([1, 2]);
    expect(l[0].reponses[q1.cle].lettres).toEqual(["A"]); expect(l[1].reponses).toEqual({});
    expect(lire(st, "admin2")).toEqual([]);
  });
  it("note /20 recalculée après correction du corrigé, question modifiée non notée", () => {
    let t = creer([], [q1.cle, "k2"], "toutes", null);
    t = repondre(t, q1, ["A"]); t = repondre(t, q2, ["B"]);
    expect(bilan(t, inv, eligible).note20).toBe(10);
    const corrige = new Map(inv); corrige.set("k2", { ...q2, bonnes: ["B"] });
    expect(bilan(t, corrige, eligible).note20).toBe(20);
    const modifie = new Map(inv); modifie.set("k2", { ...q2, empreinteContenu: "autre" });
    const b = bilan(t, modifie, eligible); expect(b.modifiees).toEqual(["k2"]); expect(b.note20).toBe(20); expect(b.notees).toBe(1);
  });
  it("tentative terminée figée", () => {
    const t = { ...creer([], [q1.cle], "toutes", null), termineeLe: "x" };
    expect(() => repondre(t, q1, ["A"])).toThrow();
  });
});
