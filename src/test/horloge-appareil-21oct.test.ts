import { describe, it, expect, vi, afterEach } from "vitest";
import { activitesDuModule, activitesRequisesModule } from "@/lib/jeuxPedagogiques";
import { activitesModuleEleve } from "@/lib/activitesModuleEleve";
import { pourcentagePagesActuelles } from "@/lib/pagesProgressionActuelle";
import { readFileSync } from "fs";

afterEach(() => vi.useRealTimers());
const LYON = ["jeu_lyon_arrondissements_quartiers", "jeu_lyon_lieux"];

describe("horloge appareil erronée (21/10)", () => {
  it("tablette réglée en 2025 : les 2 jeux du module 8 restent affichés", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    expect(activitesDuModule(8).map((a) => a.id)).toEqual(LYON);
  });
  it("tablette réglée en 2030 : mêmes 2 jeux", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2030-06-01T00:00:00Z"));
    expect(activitesDuModule(8).map((a) => a.id)).toEqual(LYON);
  });
  it("date explicite d'un relevé gelé avant le 13/10 : aucun jeu (historique inchangé)", () => {
    expect(activitesDuModule(8, "2026-10-01T00:00:00Z")).toEqual([]);
  });
  it("module terminé le 17/09 : jeux facultatifs mais visibles, même horloge ancienne", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const row = { module_id: 8, status: "completed", completed_at: "2026-09-17T10:00:00Z" } as any;
    expect(activitesRequisesModule(8, row)).toEqual([]);
    const e = activitesModuleEleve(8, [{ id: 8 }], [row], new Set());
    expect(e.etat).toBe("ok");
    if (e.etat === "ok") { expect(e.requises).toHaveLength(0); expect(e.facultatives.map((a) => a.id)).toEqual(LYON); }
  });
  it("module non terminé : les 2 jeux sont requis", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    expect(activitesRequisesModule(8, undefined).map((a) => a.id)).toEqual(LYON);
  });
  it("compteur obsolète : 10 pages vues sur 8 actuelles = 100 %, jamais 125 %", () => {
    expect(pourcentagePagesActuelles([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 8)).toBe(100);
    expect(pourcentagePagesActuelles([0, 1, 9, 12], 8)).toBe(25);
    expect(pourcentagePagesActuelles([], 0)).toBe(0);
  });
  it("lecture du contenu module : aucune borne par l'heure de l'appareil", () => {
    const src = readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
    expect(src).not.toMatch(/\.lte\("updated_at", requestTimestamp\)/);
  });
});
