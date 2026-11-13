import { describe, it, expect } from "vitest";
import { tamponnerEcrivainRevision, revisionEcriteParCetOnglet } from "@/lib/answerPersistence";

const etat = (answers: Record<string, unknown>, corrected: string[]) => ({ revisionState: { examenId: "EB5", questionOrder: ["a", "b", "c"], answers, correctedQuestions: corrected, correctedCount: corrected.length } });

describe("révision : accusé perdu sur le même onglet", () => {
  it("la version serveur écrite par cet onglet est remplacée par la version locale plus récente, même si une réponse a changé", () => {
    const ancien = tamponnerEcrivainRevision(etat({ a: "H" }, ["a"]));
    const nouveau = tamponnerEcrivainRevision(etat({ a: "Réponse complète", b: ["C"] }, ["a", "b"]));
    expect(revisionEcriteParCetOnglet(nouveau, ancien)).toBe(true);
  });
  it("jamais si la version serveur vient d'un autre appareil", () => {
    const autre = { revisionState: { ...etat({ a: "x" }, ["a"]).revisionState, _ecrivain: { id: "w_autre", n: 1 } } };
    expect(revisionEcriteParCetOnglet(tamponnerEcrivainRevision(etat({ a: "y" }, ["a"])), autre)).toBe(false);
  });
  it("jamais une version locale plus ancienne", () => {
    const ancien = tamponnerEcrivainRevision(etat({ a: "1" }, ["a"]));
    const recent = tamponnerEcrivainRevision(etat({ a: "2" }, ["a"]));
    expect(revisionEcriteParCetOnglet(ancien, recent)).toBe(false);
  });
  it("jamais retirer une validation déjà enregistrée", () => {
    const serveur = tamponnerEcrivainRevision(etat({ a: "1", b: "2" }, ["a", "b"]));
    const local = tamponnerEcrivainRevision(etat({ a: "1", b: "2" }, ["a"]));
    expect(revisionEcriteParCetOnglet(local, serveur)).toBe(false);
  });
  it("jamais un autre examen ou un autre ordre", () => {
    const serveur = tamponnerEcrivainRevision(etat({ a: "1" }, ["a"]));
    const local: any = tamponnerEcrivainRevision(etat({ a: "1" }, ["a"]));
    local.revisionState.questionOrder = ["b", "a", "c"];
    expect(revisionEcriteParCetOnglet(local, serveur)).toBe(false);
  });
  it("les sauvegardes hors révision ne sont pas modifiées", () => {
    const r = { q1: ["A"] };
    expect(tamponnerEcrivainRevision(r)).toBe(r);
  });
});

describe("révision : jamais de réponse effacée", () => {
  it("refuse une version locale qui retire une réponse enregistrée", () => {
    const serveur = tamponnerEcrivainRevision(etat({ a: "1" }, []));
    const local = tamponnerEcrivainRevision(etat({}, []));
    expect(revisionEcriteParCetOnglet(local, serveur)).toBe(false);
  });
});
