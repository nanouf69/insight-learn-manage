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
import { heuresSessionPourApprenant } from "../lib/sessionHeures";
describe("Session TAXI + TA : TA 30 h par défaut", () => {
  const s = { nom: "Session TAXI et TA - Du 7 au 28 septembre 2026", type_session: "theorique", types_apprenant: ["TAXI", "TA"] };
  it("libellé distingue TAXI 90 h et TA 30 h", () => expect(libelleHeuresSessionMixte(s)).toBe("TAXI : 90 h · TA : 30 h"));
  it("apprenant TA = 30 h, TAXI = 90 h", () => { expect(heuresSessionPourApprenant(s, "ta")).toBe(30); expect(heuresSessionPourApprenant(s, "taxi")).toBe(90); });
  it("heures enregistrées non modifiées", () => expect(heuresSessionAffichees({ ...s, heures_total: 90 })).toBe(90));
});

import { tauxTotalPresence } from "../lib/tauxTotalPresence";
it("TA : 30 h présentiel + 6 h pratique = 36 h au total", () => {
  const s = { nom: "Session TAXI et TA", type_session: "theorique", types_apprenant: ["TAXI", "TA"] };
  const r = tauxTotalPresence({ session: { faites: 30, prevues: heuresSessionPourApprenant(s, "ta")! }, pratique: { faites: 6, prevues: 6 } });
  expect(r?.prevues).toBe(36); expect(r?.pct).toBe(100);
});

import { heuresTheorieInscrites as hti } from "@/lib/sessionHeures";
import { it as it2, expect as ex2 } from "vitest";
it2("cours du soir VTC = 40 h même si la session commune est en journée", () => {
  const s = { id: "s1", type_session: "theorique", nom: "VTC TAXI", heure_debut: "09:00", types_apprenant: ["VTC", "TAXI"], date_debut: "2026-09-01", date_fin: "2026-10-01" };
  ex2(hti([{ sessions: s, heure_debut_personnalisee: "17:00" }], "vtc")).toBe(40);
  ex2(hti([{ sessions: s }], "vtc")).toBe(60);
  ex2(hti([{ sessions: { ...s, id: "s2", heures_total: 60, nom: "VTC soir" } }], "vtc")).toBe(40);
});
