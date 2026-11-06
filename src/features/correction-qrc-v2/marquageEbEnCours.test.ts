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
