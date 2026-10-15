import { describe, it, expect } from "vitest";
import { joursAvantAuditQualiopi, libelleCompteRebours } from "@/components/layout/RappelAuditQualiopi";

describe("Rappel audit Qualiopi (heure de Paris)", () => {
  it("avant le 03/11 : rien", () => expect(joursAvantAuditQualiopi(new Date("2026-11-02T22:59:00Z"))).toBeNull());
  it("03/11 00:00 Paris : J-7", () => expect(joursAvantAuditQualiopi(new Date("2026-11-02T23:00:00Z"))).toBe(7));
  it("09/11 : J-1", () => expect(joursAvantAuditQualiopi(new Date("2026-11-09T12:00:00Z"))).toBe(1));
  it("10/11 23:59 Paris : aujourd'hui", () => {
    const n = joursAvantAuditQualiopi(new Date("2026-11-10T22:59:00Z"));
    expect(n).toBe(0);
    expect(libelleCompteRebours(n!)).toBe("Aujourd'hui");
  });
  it("11/11 00:00 Paris : arrêt", () => expect(joursAvantAuditQualiopi(new Date("2026-11-10T23:00:00Z"))).toBeNull());
});
