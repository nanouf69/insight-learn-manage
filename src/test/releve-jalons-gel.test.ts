import { describe, it, expect, vi, beforeEach } from "vitest";
const state: any = { rows: [], uid: "admin-1", rpcError: null, readError: null };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: state.uid ? { id: state.uid } : null } }) },
    from: () => ({ select: () => ({ eq: (_c: string, id: string) => ({ order: () => ({ limit: async () => state.readError ? { data: null, error: state.readError } : { data: state.rows.filter((r: any) => r.apprenant_id === id).sort((a: any, b: any) => b.version - a.version), error: null } }) }) }) }),
    rpc: async (_n: string, a: any) => {
      if (state.rpcError) return { data: null, error: state.rpcError };
      const last = state.rows.filter((r: any) => r.apprenant_id === a._apprenant_id).sort((x: any, y: any) => y.version - x.version)[0];
      if (last) return { data: last, error: null };
      const row = { id: `g${state.rows.length + 1}`, apprenant_id: a._apprenant_id, version: 1, payload: JSON.parse(JSON.stringify(a._payload)), empreinte: a._empreinte, methode: a._methode, motif: a._motif, date_fin_formation: "2026-09-30", remplace_gel_id: null, cree_par: state.uid, created_at: new Date().toISOString() };
      state.rows.push(row); return { data: row, error: null };
    },
  },
}));
import { construirePayloadGel, figerReleve, chargerGelReleve, mentionGel, formationTerminee, empreinteGel } from "@/lib/releveJalonsGel";

const contenu = { questions: 100 };
const calculer = () => ({ resultat: { taux: Math.round(97.05 * 100 / 100) , questions: contenu.questions }, poids: { m2: contenu.questions / 2 } });
const payload = () => construirePayloadGel({ calcul: calculer(), preuvesJalons: { v: 1 }, session: null, elementsACompleter: [], formationLabel: "VTC-E", calculeLe: "2026-10-13T08:00:00Z" });
beforeEach(() => { state.rows = []; state.uid = "admin-1"; state.rpcError = null; state.readError = null; contenu.questions = 100; });

describe("gel du relevé à la clôture", () => {
  it("après clôture, ajout/suppression de questions ne change pas le relevé figé", async () => {
    const r = await figerReleve({ apprenantId: "a1", payload: payload(), motif: "Clôture fictive", adminId: "admin-1" });
    expect(r.statut).toBe("cree");
    contenu.questions = 140;
    expect(calculer().poids.m2).toBe(70); // formation active : reflète le changement
    const gel = await chargerGelReleve("a1");
    expect(gel!.payload.calcul.poids.m2).toBe(50);
    contenu.questions = 10;
    expect((await chargerGelReleve("a1"))!.payload).toEqual(r.gel.payload);
  });
  it("réessai idempotent : même version, aucune nouvelle ligne", async () => {
    await figerReleve({ apprenantId: "a1", payload: payload(), motif: "Clôture fictive", adminId: "admin-1" });
    const r2 = await figerReleve({ apprenantId: "a1", payload: payload(), motif: "Clôture fictive", adminId: "admin-1" });
    expect(r2.statut).toBe("existant_identique"); expect(state.rows).toHaveLength(1);
  });
  it("contenu différent après gel : archive existante conservée, jamais réécrite", async () => {
    const r1 = await figerReleve({ apprenantId: "a1", payload: payload(), motif: "Clôture fictive", adminId: "admin-1" });
    contenu.questions = 200;
    const r2 = await figerReleve({ apprenantId: "a1", payload: payload(), motif: "Clôture fictive", adminId: "admin-1" });
    expect(r2.statut).toBe("existant_conserve"); expect(r2.gel.empreinte).toBe(r1.gel.empreinte);
  });
  it("mauvaise identité / session changée : refus", async () => {
    state.uid = "autre";
    await expect(figerReleve({ apprenantId: "a1", payload: payload(), motif: "Clôture fictive", adminId: "admin-1" })).rejects.toThrow(/Session/);
    expect(state.rows).toHaveLength(0);
  });
  it("refus serveur (non admin / non terminée) : rien de figé", async () => {
    state.rpcError = { message: "Formation non terminée : clôture refusée" };
    await expect(figerReleve({ apprenantId: "a1", payload: payload(), motif: "Clôture fictive", adminId: "admin-1" })).rejects.toBeTruthy();
    expect(await chargerGelReleve("a1")).toBeNull();
  });
  it("motif obligatoire", async () => {
    await expect(figerReleve({ apprenantId: "a1", payload: payload(), motif: " ", adminId: "admin-1" })).rejects.toThrow(/Motif/);
  });
  it("erreur de lecture du gel : exception, jamais « non figé » silencieux", async () => {
    state.readError = { message: "réseau" };
    await expect(chargerGelReleve("a1")).rejects.toBeTruthy();
  });
  it("archive altérée : refusée", async () => {
    await figerReleve({ apprenantId: "a1", payload: payload(), motif: "Clôture fictive", adminId: "admin-1" });
    state.rows[0].payload.calcul.poids.m2 = 1;
    await expect(chargerGelReleve("a1")).rejects.toThrow(/empreinte/);
  });
  it("formation terminée sans archive : version historique non disponible explicite", () => {
    const now = new Date("2026-10-13T08:00:00Z");
    expect(formationTerminee({ date_fin_formation: "2026-09-30" }, now)).toBe(true);
    expect(formationTerminee({ date_fin_formation: "2026-10-13" }, now)).toBe(false);
    expect(formationTerminee({ date_fin_formation: "30/09/2026" }, now)).toBe(true);
    expect(formationTerminee({ date_fin_formation: "30/11/2026" }, now)).toBe(false);
    expect(mentionGel(null, { date_fin_formation: "2026-09-30" })).toMatch(/version historique non disponible/);
  });
  it("empreinte stable quel que soit l'ordre des clés", async () => {
    const a = construirePayloadGel({ calcul: { x: 1, y: 2 }, preuvesJalons: null, session: null, elementsACompleter: [], formationLabel: "L", calculeLe: "t" });
    const b = construirePayloadGel({ formationLabel: "L", session: null, preuvesJalons: null, elementsACompleter: [], calcul: { y: 2, x: 1 }, calculeLe: "t" });
    expect(await empreinteGel(a)).toBe(await empreinteGel(b));
  });
});
