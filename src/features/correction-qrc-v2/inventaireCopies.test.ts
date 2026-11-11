import { describe, expect, it } from "vitest";
import { miroirsV2Prouves, cleAffichage, estExamenBlancReel, inventaireAttendu, nbQrcEcrites, rapprocher, resultatsAncienCircuit, resultatsMigres } from "./inventaireCopies";

const r = (id: string, quiz_id: string, extra: any = {}) => ({ id, apprenant_id: "a-" + id, quiz_id, completed_at: "2026-11-05T19:00:00Z", ...extra });

describe("inventaire des copies EB", () => {
  it("reconnaît tous les EB VTC/TAXI/TA/VA, exclut EB99", () => {
    for (const q of ["EB1", "EB3", "EB6", "EB1-TAXI", "EB2-TAXI", "eb4-ta", "eb5-va"]) expect(estExamenBlancReel(q)).toBe(true);
    for (const q of ["EB99", "EB99TEST", "bilan", "EB"]) expect(estExamenBlancReel(q)).toBe(false);
  });

  it("liste en ancien circuit EB1, EB4–6 et TAXI non migrés, sans EB2 VTC ni copies migrées (pas de doublon)", () => {
    const migres = resultatsMigres([{ attempt_id: "t", apprenant_id: "x", exam_id: "EB3", rid: "m3" }]);
    const res = resultatsAncienCircuit([r("1", "EB1"), r("2", "EB2"), r("3", "EB2-TAXI"), r("m3", "EB3"), r("4", "EB5"), r("5", "EB3-TAXI"), r("6", "EB99"), r("7", "EB1", { completed_at: null }), r("1", "EB1")], migres);
    expect(res.map((x) => x.id)).toEqual(["1", "3", "4", "5"]);
  });

  it("compte les QRC écrites (texte non vide) et ignore les choix QCM", () => {
    expect(nbQrcEcrites({ 1: "Tns", 2: "  ", 3: ["B"], 4: "x" })).toBe(2);
    expect(nbQrcEcrites(null)).toBe(0);
  });

  it("signale nominativement une copie terminée avec QRC absente (journée comme soir), V2 et historique", () => {
    const attendues = inventaireAttendu({
      tentatives: [
        { attempt_id: "v-jour", apprenant_id: "j", exam_id: "EB3-TAXI", etat: "terminee" },
        { attempt_id: "v-soir", apprenant_id: "s", exam_id: "EB1", etat: "terminee" },
        { attempt_id: "v-cours", apprenant_id: "c", exam_id: "EB2", etat: "en_cours" },
        { attempt_id: "v-neut", apprenant_id: "n", exam_id: "EB1", etat: "terminee" },
        { attempt_id: "v-mig", apprenant_id: "h", exam_id: "EB2", etat: "terminee", rid: "h1" },
      ],
      qrcParTentative: new Map([["v-jour", 2], ["v-soir", 3], ["v-cours", 1], ["v-neut", 1], ["v-mig", 2]]),
      neutralises: new Set(["v-neut"]),
      exclus: new Set(["test"]),
      resultats: [
        { ...r("h1", "EB2"), qrc: 2 },
        { ...r("e2", "EB2"), qrc: 1 },
        { ...r("e1", "EB1-TAXI"), qrc: 4 },
        { ...r("q", "EB4"), qrc: 0 },
        { ...r("t", "EB1"), apprenant_id: "test", qrc: 3 },
      ],
    });
    expect(attendues.map((a) => a.cle).sort()).toEqual(["ancien:e1", "ancien:q", "consultation:e2", "v-jour", "v-mig", "v-soir"]);
    const res = rapprocher(attendues, new Set(["v-jour", "v-mig", cleAffichage("consultation", "e2")]));
    expect(res.attendues).toBe(6);
    expect(res.visibles).toBe(3);
    expect(res.manquantes.map((m) => [m.cle, m.cause])).toEqual([
      ["v-soir", "Passage V2 terminé absent de la grille"],
      ["ancien:e1", "Copie historique non migrée absente de l'ancien circuit"],
      ["ancien:q", "Copie historique non migrée absente de l'ancien circuit"],
    ]);
  });

  it("zéro manquante quand tout est affiché", () => {
    const att = inventaireAttendu({ tentatives: [{ attempt_id: "a", apprenant_id: "x", exam_id: "EB2-TAXI", etat: "terminee" }], qrcParTentative: new Map([["a", 1]]), neutralises: new Set(), exclus: new Set(), resultats: [] });
    expect(rapprocher(att, new Set(["a"])).manquantes).toEqual([]);
  });

  it("miroir V2 natif prouvé seulement par réponses QRC identiques, unique, même matière", () => {
    const res = [
      { ...r("m", "EB1"), apprenant_id: "x", matiere_id: "gestion", rep: { 1: "TNS", 2: "Cotisation", 3: ["B"] } },
      { ...r("d", "EB1"), apprenant_id: "x", matiere_id: "gestion", rep: { 1: "TNS", 2: "autre" } },
      { ...r("o", "EB1"), apprenant_id: "x", matiere_id: "t3p", rep: { 1: "TNS", 2: "Cotisation" } },
      { ...r("s", "EB3"), apprenant_id: "y", matiere_id: "gestion", rep: { 1: "A" } },
    ];
    const tent = [
      { attempt_id: "v1", apprenant_id: "x", exam_id: "EB1", etat: "terminee", matiere: "gestion" },
      { attempt_id: "y1", apprenant_id: "y", exam_id: "EB3", etat: "terminee", matiere: "gestion" },
      { attempt_id: "y2", apprenant_id: "y", exam_id: "EB3", etat: "terminee", matiere: "gestion" },
    ];
    const qrc = [{ attempt_id: "v1", reponse: "Cotisation" }, { attempt_id: "v1", reponse: "TNS" }, { attempt_id: "y1", reponse: "A" }, { attempt_id: "y2", reponse: "A" }];
    expect([...miroirsV2Prouves(res, tent, qrc)]).toEqual([]);
  });
});
