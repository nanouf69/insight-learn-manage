import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { deciderCloture, compterReponsesSaisies, resultatsDuPassage } from "@/lib/examClotureGarde";

const base = { reponsesChargees: true, routageResolu: true, ligneServeurTerminee: false, nbReponsesSaisies: 3 };

describe("garde de clôture d'une matière (fictif, aucune écriture)", () => {
  it("chrono expiré avant chargement des réponses → attendre", () => {
    expect(deciderCloture({ ...base, reponsesChargees: false })).toBe("attendre");
  });
  it("routage V2 retardé → attendre (jamais d'envoi ancien circuit prématuré)", () => {
    expect(deciderCloture({ ...base, routageResolu: false })).toBe("attendre");
  });
  it("expiration authentique sans réponse → sans_reponse (aucune ligne vide, aucune note)", () => {
    expect(deciderCloture({ ...base, nbReponsesSaisies: 0 })).toBe("sans_reponse");
  });
  it("clé déjà terminée côté serveur (changement de tentative) → aucune réécriture", () => {
    expect(deciderCloture({ ...base, ligneServeurTerminee: true })).toBe("deja_terminee");
  });
  it("réponses réelles → finalisation normale", () => {
    expect(deciderCloture(base)).toBe("finaliser");
  });
  it("comptage : QCM vide, texte blanc et null ne comptent pas", () => {
    expect(compterReponsesSaisies({})).toBe(0);
    expect(compterReponsesSaisies({ 1: [], 2: "  ", 3: null })).toBe(0);
    expect(compterReponsesSaisies({ 1: ["A"], 2: "texte" })).toBe(2);
  });
  it("reprise : résultats pré-chargés limités à la tentative reprise (cascade T3P 14/10)", () => {
    const rows = [
      { m: "securite", t: 1 }, { m: "t3p", t: 2 }, { m: "gestion", t: 2 }, null as any,
    ];
    expect(resultatsDuPassage(rows, 2, (r) => r.t).map((r) => r.m)).toEqual(["t3p", "gestion"]);
    expect(resultatsDuPassage(rows, 1, (r) => r.t).map((r) => r.m)).toEqual(["securite"]);
  });
});

describe("raccordement dans le code (contrôle statique)", () => {
  const passage = readFileSync("src/components/cours-en-ligne/ExamenBlancsPassage.tsx", "utf8");
  const page = readFileSync("src/components/cours-en-ligne/ExamensBlancsPage.tsx", "utf8");
  const res = readFileSync("src/components/cours-en-ligne/ExamenBlancsResultats.tsx", "utf8");
  it("expiration et interruption passent par la garde avant toute écriture", () => {
    const expire = passage.slice(passage.indexOf("const handleExpire = async"), passage.indexOf("const handleInterruption"));
    expect(expire.indexOf("deciderCloture")).toBeLessThan(expire.indexOf("enqueueAnswerSave"));
    expect(expire).toContain("expirationDiffereeRef.current = true");
    expect(expire).toContain("latestReponsesRef.current");
    const inter = passage.slice(passage.indexOf("const handleInterruption"), passage.indexOf("const isMultiple"));
    expect(inter.indexOf("deciderCloture")).toBeLessThan(inter.indexOf("enqueueAnswerSave"));
  });
  it("expiration différée rejouée après chargement + routage", () => {
    expect(passage).toMatch(/initialLoaded && routageResolu && expirationDiffereeRef\.current/);
  });
  it("routage en erreur ne marque jamais le passage comme résolu", () => {
    const i = passage.indexOf("routage impossible");
    expect(passage.slice(i, i + 120)).toContain("return;");
  });
  it("reprise alignée sur passage.tentative et sortie sans résultat câblée", () => {
    expect(page).toContain("resultatsDuPassage(allResultRows, passage.tentative");
    expect(page).toContain("onSansReponse={handleMatiereSansResultat}");
  });
  it("résultats : emplacement null ne plante plus (erreur quizId 14/10)", () => {
    expect(res).toContain("r == null ? r");
  });
});
