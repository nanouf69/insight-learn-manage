import { describe, it, expect } from "vitest";
import { prefixeEb, groupeEnCours } from "./marquageEbEnCours";

const jour = "2026-11-06";
describe("marquage EB session en cours", () => {
  it("session CRM dont la période contient aujourd'hui → marquée", () => {
    expect(prefixeEb({ type: "crm", debut: "2026-11-02", fin: "2026-11-13" }, jour)).toBe("🔴 EN COURS — ");
  });
  it("bornes incluses", () => {
    expect(groupeEnCours({ type: "crm", debut: jour, fin: jour }, jour)).toBe(true);
  });
  it("session terminée ou future → non marquée", () => {
    expect(prefixeEb({ type: "crm", debut: "2026-10-01", fin: "2026-11-05" }, jour)).toBe("");
    expect(prefixeEb({ type: "crm", debut: "2026-11-07", fin: "2026-11-20" }, jour)).toBe("");
  });
  it("groupes sans session ou en conflit → jamais marqués", () => {
    expect(prefixeEb({ type: "indetermine", debut: "2026-11-01", fin: "2026-11-30" }, jour)).toBe("");
    expect(prefixeEb({ type: "conflit", debut: "2026-11-01", fin: "2026-11-30" }, jour)).toBe("");
  });
  it("dates manquantes → non marquée", () => {
    expect(prefixeEb({ type: "crm", debut: null, fin: "2026-11-30" }, jour)).toBe("");
  });
});

import { ebsLesPlusRecents } from "./marquageEbEnCours";
describe("ebsLesPlusRecents", () => {
  const g = { type: "crm", debut: "2026-11-01", fin: "2026-11-30" };
  const ex = [
    { cle: "eb1", dates: [{ jour: "2026-11-02", heureMax: "10:00" }] },
    { cle: "eb2", dates: [{ jour: "2026-11-05", heureMax: "09:00" }] },
    { cle: "eb3", dates: [{ jour: "2026-11-04", heureMax: "18:00" }, { jour: "2026-11-01", heureMax: "08:00" }] },
  ];
  it("marque seulement l'EB au passage le plus récent", () => {
    expect([...ebsLesPlusRecents(g, ex, "2026-11-06")]).toEqual(["eb2"]);
  });
  it("ne se fie pas au numéro d'EB", () => {
    const e = [{ cle: "eb5", dates: [{ jour: "2026-11-01", heureMax: "10:00" }] }, { cle: "eb1", dates: [{ jour: "2026-11-03", heureMax: "10:00" }] }];
    expect([...ebsLesPlusRecents(g, e, "2026-11-06")]).toEqual(["eb1"]);
  });
  it("égalité exacte : les deux", () => {
    const e = [{ cle: "a", dates: [{ jour: "2026-11-03", heureMax: "10:00" }] }, { cle: "b", dates: [{ jour: "2026-11-03", heureMax: "10:00" }] }];
    expect(ebsLesPlusRecents(g, e, "2026-11-06").size).toBe(2);
  });
  it("session non en cours : rien", () => {
    expect(ebsLesPlusRecents({ ...g, fin: "2026-11-05" }, ex, "2026-11-06").size).toBe(0);
  });
});
