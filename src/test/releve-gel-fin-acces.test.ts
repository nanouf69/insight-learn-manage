import { describe, it, expect, vi, beforeEach } from "vitest";
const st: any = {};
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (t: string) => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => st.readError ? { data: null, error: st.readError } : { data: st.gels, error: null } }) }), in: async () => ({ data: st.contenu, error: null }) }) }),
  rpc: async () => ({ data: st.fin, error: null }),
} }));
import { chargerEtatGel, lireContenuFige, mentionGel } from "@/lib/releveJalonsGel";
const gel = (o: any = {}) => ({ id: "g1", apprenant_id: "a", version: 1, fin_acces: "2026-09-30", nature: "protection_apres_fin", historique_prouve: false, contenu: { "2": "h2" }, sources: { completions: [], emargements: [], heures_validees: [] }, heures_validee_id: null, remplace_id: null, created_at: "2026-10-13T09:07:00Z", ...o });
beforeEach(() => { st.readError = null; st.gels = []; st.fin = null; st.contenu = []; });
describe("gel fin d'accès", () => {
  it("accès en cours => calcul actuel", async () => { expect((await chargerEtatGel("a")).etat).toBe("actif"); });
  it("accès terminés sans gel => en attente explicite, pas de calcul actuel", async () => { st.fin = "2026-10-12"; const e = await chargerEtatGel("a"); expect(e.etat).toBe("en_attente"); expect(mentionGel(e)).toMatch(/en attente/); });
  it("gel présent => figé ; erreur de lecture => exception", async () => {
    st.gels = [gel()]; expect((await chargerEtatGel("a")).etat).toBe("fige");
    st.readError = { message: "x" }; await expect(chargerEtatGel("a")).rejects.toBeTruthy();
  });
  it("gel après fin d'accès : jamais présenté comme historique prouvé", () => {
    expect(mentionGel({ etat: "fige", gel: gel() as any })).toMatch(/état historique à la fin des accès non disponible/);
    expect(mentionGel({ etat: "fige", gel: gel({ historique_prouve: true, version: 2 }) as any })).toMatch(/Version 2 : heures de pratique/);
  });
  it("contenu figé incomplet => indisponible (aucun repli sur le contenu actuel)", async () => {
    await expect(lireContenuFige(gel() as any, [2])).rejects.toThrow(/incomplet/);
    st.contenu = [{ empreinte: "h2", module_id: 2, module_data: { q: 1 }, deleted_exercices: null, deleted_cours: null, source_updated_at: null }];
    expect((await lireContenuFige(gel() as any, [2, 99]))[0].module_data).toEqual({ q: 1 });
  });
});
