import { describe, it, expect, vi, beforeEach } from "vitest";
const st: any = { appels: [] as string[], row: null };
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (t: string) => { st.appels.push(t); return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: st.row, error: null }) }) }) }; } } }));
// Programme du code : s'il était appelé pendant une lecture figée, le test échouerait.
vi.mock("@/components/cours-en-ligne/ModuleDetailView", () => ({ getInitialModuleContentForVolume: () => { throw new Error("CODE ACTUEL APPELÉ"); } }));
vi.mock("@/components/cours-en-ligne/ExamensBlancsEditor", () => ({ loadSavedExamens: () => { throw new Error("CONTENU ACTUEL APPELÉ"); } }));
import { chargerCalculJalons } from "@/lib/jalonsPedagogiques";
import { recalculerPratiqueSeule } from "@/lib/releveCalculServeur";
import { MODULES_PONDERES, PRATIQUE_PHYSIQUE, avecJalonPratique, calculerDureesPrevisionnelles, calculerJalonsPonderes, calculerPoids, completionPratique } from "@/lib/jalonsPonderes";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";

const gel: any = { id: "g1", apprenant_id: "fictif", version: 1, contenu: {}, sources: {} };
function baseFictive() {
  const volumes = Object.fromEntries(MODULES_PONDERES.vtc.map((id) => [id, { pages: 10, questions: 5, points: id === PRATIQUE_PHYSIQUE ? 360 : undefined }]));
  const parcours = avecJalonPratique(FORMATION_MODULES["vtc-e"].modules.map((m) => m.id));
  const completions = [...parcours.filter((id) => id > 0 && id !== PRATIQUE_PHYSIQUE).slice(0, 3).map((id) => ({ module_id: id, status: "completed" })), completionPratique(0)];
  const poids = calculerPoids("vtc", volumes as any);
  return { key: "vtc-e", gelId: "g1", filiere: "vtc" as const, parcours, volumes, limites: [], durees: calculerDureesPrevisionnelles("vtc", volumes as any), poids, completions,
    resultat: calculerJalonsPonderes("vtc", parcours, completions, poids), pratique: { minutes: 0, detail: { pratiqueSignee: 0, theorieSignee: 0, valideesAdmin: 0 }, progression: 0, dernierePreuve: null, source: "x" } } as any;
}
const sourcesV2 = (heures: any[]) => ({ completions: [], emargements: [], heures_validees: heures, reservations_pratique: [], sessions: [], planning_configs: [] });

beforeEach(() => { st.appels = []; st.row = null; });
describe("calcul figé serveur", () => {
  it("relevé figé : lecture du calcul enregistré seulement (code/éditeur/planning modifiés => identique)", async () => {
    const base = baseFictive();
    st.row = { calcul: base, methode: "m", code_ref: "c", created_at: "2026-10-13T09:07:01Z" };
    const a = await chargerCalculJalons({ apprenantId: "fictif", typeApprenant: "vtc-e", gel });
    const b = await chargerCalculJalons({ apprenantId: "fictif", typeApprenant: "vtc-e", gel });
    expect(a.resultat).toEqual(base.resultat); expect(b.poids).toEqual(base.poids);
    expect(new Set(st.appels)).toEqual(new Set(["releve_jalons_calcul_fige"]));
  });
  it("aucun calcul figé avant la première ouverture => indisponible, jamais calculé à la lecture", async () => {
    await expect(chargerCalculJalons({ apprenantId: "fictif", typeApprenant: "vtc-e", gel })).rejects.toThrow(/indisponible/);
    expect(st.appels).toEqual(["releve_jalons_calcul_fige"]);
  });
  it("ajout admin pratique : seule la ligne pratique change, poids/volumes/durées figés", () => {
    const base = baseFictive();
    const v2 = recalculerPratiqueSeule(base, { id: "g2", sources: sourcesV2([{ id: "h", heures: 6, created_at: "2026-10-14T08:00:00Z", date_presence: "2026-10-14", categorie: "pratique", motif: "séance" }]) });
    expect(v2.poids).toEqual(base.poids); expect(v2.volumes).toEqual(base.volumes); expect(v2.durees).toEqual(base.durees);
    expect(v2.pratique.minutes).toBe(360);
    const pr = (c: any) => c.resultat.lignes.find((l: any) => l.moduleId === PRATIQUE_PHYSIQUE);
    expect(pr(v2).progression).toBe(100); expect(pr(base).progression).toBe(0);
    for (const l of base.resultat.lignes.filter((x: any) => x.moduleId !== PRATIQUE_PHYSIQUE)) expect(v2.resultat.lignes.find((x: any) => x.moduleId === l.moduleId)).toEqual(l);
    expect(v2.resultat.taux).toBeGreaterThan(base.resultat.taux);
  });
  it("planning non archivé => calcul pratique refusé (aucun repli)", () => {
    expect(() => recalculerPratiqueSeule(baseFictive(), { id: "g2", sources: { heures_validees: [] } })).toThrow(/non archivé/);
  });
});
