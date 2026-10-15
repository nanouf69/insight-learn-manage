// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { heuresSessionAffichees, libelleHeuresSessionMixte } from "../lib/sessionHeures";

describe("Durées affichées des sessions communes", () => {
  it("ne lit pas le nom avant la sélection d'une session", () => {
    const source = readFileSync(new URL("../components/sessions/SessionDetail.tsx", import.meta.url), "utf8");
    expect(source).toMatch(/const libelleHeuresMixte = session\s*\? libelleHeuresSessionMixte\([\s\S]*?\)\s*: null;/);
  });
  it("distingue VTC et TAXI sans modifier la valeur enregistrée", () => {
    const s = { nom: "Session VTC et TAXI", type_session: "theorique", heures_total: 75 };
    const before = JSON.stringify(s);
    expect(libelleHeuresSessionMixte(s)).toBe("VTC : 60 h · TAXI : 90 h");
    expect(heuresSessionAffichees(s)).toBe(75);
    expect(JSON.stringify(s)).toBe(before);
  });
  it("reconnaît les types enregistrés", () => {
    expect(libelleHeuresSessionMixte({ types_apprenant: ["vtc", "taxi"] })).toBe("VTC : 60 h · TAXI : 90 h");
  });
  it.each([
    { nom: "Formation VTC" }, { nom: "Formation TAXI" },
    { nom: "Formation VTC et TAXI cours du soir" },
    { nom: "Formation pratique VTC TAXI", type_session: "pratique" },
    { nom: "Formation continue VTC TAXI" },
    { nom: "Session VTC TAXI", heure_debut: "17:00" },
    { nom: "Session examen VTC TAXI" },
  ])("préserve les autres sessions : %j", (s) => {
    expect(libelleHeuresSessionMixte(s)).toBeNull();
  });
  it.each([
    ["Formation VTC", 60], ["Formation TAXI", 90],
    ["Formation VTC cours du soir", 40], ["Formation TA", 30],
  ])("conserve le défaut %s", (nom, heures) => {
    expect(heuresSessionAffichees({ nom: String(nom) })).toBe(heures);
  });
});