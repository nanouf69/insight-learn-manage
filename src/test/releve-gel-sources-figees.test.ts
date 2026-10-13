import { describe, it, expect, vi } from "vitest";
// Toute lecture en direct pendant un relevé figé fait échouer le test.
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => { throw new Error("LECTURE EN DIRECT INTERDITE"); }, rpc: () => { throw new Error("RPC INTERDITE"); } } }));
vi.mock("@/lib/supabase/fetch-all-rows", () => ({ fetchAllRows: () => { throw new Error("LECTURE EN DIRECT INTERDITE"); } }));
import { pratiqueSlotDetailsDepuisGel } from "@/lib/pratiqueSlots";
import { chargerPreuvesJalons } from "@/lib/preuvesJalons";

const sources = () => ({
  completions: [{ module_id: 2, status: "completed" }],
  emargements: [{ id: "e1", date_emargement: "2026-06-10", demi_journee: "matin", signature_data_url: "signee", masque: false }, { id: "e2", date_emargement: "2026-06-11", demi_journee: "matin", signature_data_url: "signee", masque: true }],
  heures_validees: [{ id: "h1", heures: 6, created_at: "2026-10-12T22:03:00Z", date_presence: null, categorie: null, motif: null }],
  reservations_pratique: [{ date_choisie: "2026-06-10", type_formation: "vtc", creneau: "journee" }],
  sessions: [],
  planning_configs: [{ planning_start_date: "2026-06-01", planning_end_date: "2026-06-30", day_time_slots: { "2026-06-10": { matin: "8h-12h", apresmidi: "13h-17h" } }, updated_at: "2026-06-01" }],
  activites: [{ id: 1, module_id: 2, module_nom: "A", action_type: "open_cours", occurred_at: "2026-05-01T10:00:00Z" }],
  reponses: [{ id: "r", exercice_id: "module_2_exo_1", reponses: { 1: "B" }, completed: true, updated_at: "2026-05-01T10:05:00Z" }],
  quiz: [], tentatives_v2: [], connexions: [],
});

describe("relevé figé : uniquement les archives", () => {
  it("créneaux pratiques recalculés depuis le planning archivé (horaires retenus), jamais le planning actuel", () => {
    const d = pratiqueSlotDetailsDepuisGel(sources());
    expect(d[0].minutes).toBe(480);
    expect(d[0].label).toBe("8h - 12h + 13h - 17h");
  });
  it("planning non archivé => indisponible, aucun repli", () => {
    const s: any = sources(); delete s.planning_configs;
    expect(() => pratiqueSlotDetailsDepuisGel(s)).toThrow(/non archivé/);
  });
  it("preuves PDF identiques avant/après modification de code/éditeur/planning (aucune lecture en direct)", async () => {
    const gel = { sources: sources(), fin_acces: "2026-09-30" };
    const p = { apprenant: { id: "fictif", date_fin_cours_en_ligne: "2099-01-01" }, filiere: "vtc" as const, lignesModuleIds: [2, 8], completions: [] as any, gel };
    const a = await chargerPreuvesJalons(p);
    const b = await chargerPreuvesJalons(p);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(a.sources.every((s) => s.lu)).toBe(true);
    expect(a.chronologie.some((t) => t.ref === "emargement:e2")).toBe(false);
  });
  it("source absente de l'archive => lecture non possible (jamais 0 trace)", async () => {
    const s: any = sources(); delete s.connexions;
    const r = await chargerPreuvesJalons({ apprenant: { id: "fictif" }, filiere: "vtc", lignesModuleIds: [2], completions: [], gel: { sources: s } });
    expect(r.sources.find((x) => x.cle === "connexions")!.lu).toBe(false);
  });
});
