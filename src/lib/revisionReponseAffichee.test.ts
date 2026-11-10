import { describe, it, expect } from "vitest";
import { reponseRevisionAffichee } from "./revisionFaussesProgression";

const it_ = (m: string, q: string) => ({ matiere: { id: m }, question: { id: q } });
const liste = [it_("t3p", "2"), it_("anglais", "2"), it_("gestion", "4")];

describe("réponse proposée en révision des questions fausses", () => {
  it("la clé matière:question fait foi, même si une ancienne clé nue existe", () => {
    expect(reponseRevisionAffichee({ "anglais:2": ["C"], "2": ["A"] }, liste, liste[1])).toEqual(["C"]);
  });
  it("une ancienne clé nue partagée par deux matières n'est jamais proposée", () => {
    expect(reponseRevisionAffichee({ "2": ["A"] }, liste, liste[0])).toBeUndefined();
    expect(reponseRevisionAffichee({ "2": ["A"] }, liste, liste[1])).toBeUndefined();
  });
  it("une ancienne clé nue unique dans la liste reste reprise", () => {
    expect(reponseRevisionAffichee({ "4": "texte" }, liste, liste[2])).toBe("texte");
  });
  it("la dernière réponse écrite remplace l'affichage précédent", () => {
    expect(reponseRevisionAffichee({ "t3p:2": ["B"] }, liste, liste[0])).toEqual(["B"]);
    expect(reponseRevisionAffichee({ "t3p:2": ["B", "D"] }, liste, liste[0])).toEqual(["B", "D"]);
  });
});
