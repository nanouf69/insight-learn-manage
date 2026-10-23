import { describe, it, expect } from "vitest";
import { activitesModuleEleve, jeuxRestants } from "@/lib/activitesModuleEleve";
import { IDS_TAXI } from "@/components/cours-en-ligne/pratique-taxi-2026/donnees";

const parcours = [{ id: 6 }];
const D = "2026-10-23T10:00:00Z";

describe("Module 6 Pratique TAXI — 3 exercices", () => {
  it("module non terminé : les 3 exercices sont requis, 0/3", () => {
    const e: any = activitesModuleEleve(6, parcours, [{ module_id: 6, status: "in_progress", progress: 40 }] as any, new Set(), "fictif", D);
    expect(e.requises.map((a: any) => a.id).sort()).toEqual([...IDS_TAXI].sort());
    expect(jeuxRestants(e)).toBe(3);
  });
  it("2 confirmés serveur : 1 restant", () => {
    const e = activitesModuleEleve(6, parcours, [] as any, new Set(IDS_TAXI.slice(0, 2)), "fictif", D);
    expect(jeuxRestants(e)).toBe(1);
  });
  it("module validé avant l'ajout (21/10) : aucun requis, 3 facultatifs", () => {
    const e: any = activitesModuleEleve(6, parcours, [{ module_id: 6, status: "completed", completed_at: "2026-10-01T09:00:00Z" }] as any, new Set(), "fictif", D);
    expect(e.requises).toEqual([]); expect(e.facultatives).toHaveLength(3);
  });
  it("module validé sans date lisible : acquis conservé, aucun requis", () => {
    const e: any = activitesModuleEleve(6, parcours, [{ module_id: 6, status: "completed", completed_at: null }] as any, new Set(), "fictif", D);
    expect(e.requises).toEqual([]);
  });
  it("module 8 VTC non concerné par les exercices TAXI", () => {
    const e: any = activitesModuleEleve(8, [{ id: 8 }], [] as any, new Set(), "fictif", D);
    expect(e.requises.some((a: any) => IDS_TAXI.includes(a.id))).toBe(false);
  });
});
