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

import { completionAvecActivites, activitesDuModule } from "@/lib/jeuxPedagogiques";
describe("Dispense historique module 6 bornée au 23/10/2026 09:51 UTC", () => {
  const ligne = (completed_at: string | null, status = "completed") => ({ module_id: 6, status, completed_at, progress: status === "completed" ? 100 : 40 });
  const jalon = (row: any) => completionAvecActivites(row, activitesDuModule(6, D), new Set(), {} as any);
  it("completed 22/10 sans jeux : acquis, aucun requis, jalon non abaissé", () => {
    const e: any = activitesModuleEleve(6, parcours, [ligne("2026-10-22T14:00:00Z")] as any, new Set(), "fictif", D);
    expect(e.requises).toEqual([]);
    const j: any = jalon(ligne("2026-10-22T14:00:00Z"));
    expect(j.requises).toEqual([]);
  });
  it("completed avant 21/10 : jalon sans requis", () => {
    expect((jalon(ligne("2026-10-01T09:00:00Z")) as any).requises).toEqual([]);
  });
  it("in_progress au 23/10 : les 3 restent requis", () => {
    expect((jalon(ligne(null, "in_progress")) as any).requises.sort()).toEqual([...IDS_TAXI].sort());
  });
  it("nouveau completed après la borne sans les 3 jeux : jamais dispensé", () => {
    const e: any = activitesModuleEleve(6, parcours, [ligne("2026-10-23T09:52:00Z")] as any, new Set(), "fictif", "2026-10-24T00:00:00Z");
    expect(e.requises).toHaveLength(3); expect(jeuxRestants(e)).toBe(3);
    expect((jalon(ligne("2026-10-23T09:52:00Z")) as any).requises).toHaveLength(3);
  });
});
