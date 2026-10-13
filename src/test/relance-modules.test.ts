import { describe, it, expect } from "vitest";
import { etatModules, exclusionRelance, mailModulesATerminer } from "../../supabase/functions/_shared/relance-modules";
const now = new Date("2026-10-13T09:00:00Z");
const ctx = { testIds: new Set<string>(), gelIds: new Set<string>() };
const base = { id: "f", type_apprenant: "vtc-e", date_debut_cours_en_ligne: "2026-09-01", date_fin_cours_en_ligne: "2026-12-01" };
const nom = (id: number) => `Module fictif ${id}`;
describe("relances pédagogiques (fictif)", () => {
  it.each([["vtc-e", [26, 2, 4, 5, 35, 8]], ["taxi-e", [26, 10, 9, 11, 36, 6]], ["ta-e", [32, 40]], ["va-e", [41]]])("%s : 100 %% completed => 0 relance", (_t, mods) => {
    expect(etatModules(mods, mods.map((m) => ({ module_id: m, status: "completed" }))).relancePertinente).toBe(false);
  });
  it("progress 100 mais in_progress => reste à faire", () => {
    const e = etatModules([2, 4], [{ module_id: 2, status: "completed" }, { module_id: 4, status: "in_progress" }]);
    expect(e.restantsEnLigne).toEqual([4]); expect(e.relancePertinente).toBe(true);
  });
  it("seule la pratique physique reste => pas de relance de connexion", () => {
    expect(etatModules([2, 8], [{ module_id: 2, status: "completed" }]).relancePertinente).toBe(false);
    expect(etatModules([10, 6], [{ module_id: 10, status: "completed" }]).pratiqueRestante).toBe(true);
  });
  it("exclusions : expiré, archivé, gelé, test, FC/présentiel", () => {
    expect(exclusionRelance(base, now, ctx)).toBeNull();
    expect(exclusionRelance({ ...base, date_fin_cours_en_ligne: "2026-10-01" }, now, ctx)).toMatch(/terminés/);
    expect(exclusionRelance({ ...base, compte_cours_archive_at: "2026-10-02" }, now, ctx)).toBe("archivé");
    expect(exclusionRelance(base, now, { ...ctx, gelIds: new Set(["f"]) })).toMatch(/figé/);
    expect(exclusionRelance(base, now, { ...ctx, testIds: new Set(["f"]) })).toBe("compte test");
    expect(exclusionRelance({ ...base, type_apprenant: "formation-continue-vtc" }, now, ctx)).toBe("non e-learning");
  });
  it("texte : modules, pas d'heures, pas d'identifiants ni CPF", () => {
    const m = mailModulesATerminer({ prenom: "Alice <b>", etat: etatModules([2, 4, 8], [{ module_id: 2, status: "completed" }]), nomModule: nom });
    expect(m.subject).toBe("Votre formation : les modules à terminer");
    expect(m.html).toContain("Module fictif 4"); expect(m.html).not.toContain("Module fictif 8");
    expect(m.html).toMatch(/pratique se fait en présentiel/);
    expect(m.html).not.toMatch(/heures|mot de passe|identifiant|CPF|cumuler/i);
    expect(m.html).toContain("Alice &lt;b&gt;");
  });
});
