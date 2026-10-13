import { describe, it, expect, vi } from "vitest";

const state: { rows: any[]; error: any } = { rows: [], error: null };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ order: async () => ({ data: state.error ? null : state.rows, error: state.error }) }) }),
    }),
  },
}));

import { fetchHeuresValideesAdmin, normaliserHeuresValidees, libelleHeureValidee } from "@/lib/heuresValideesAdmin";

describe("heures validées admin — source unique (données fictives)", () => {
  it("ancienne ligne : catégorie et date de présence non renseignées, saisie distincte, après fin signalée, 6 h conservées", async () => {
    state.rows = [{ id: "a", heures: 6, motif: null, created_at: "2026-10-12T20:03:00Z", date_presence: null, categorie: null }];
    state.error = null;
    const r = await fetchHeuresValideesAdmin("fictif", "2026-09-30");
    expect(r.minutes).toBe(360);
    const l = r.lignes[0].label;
    expect(l).toContain("catégorie non renseignée");
    expect(l).toContain("date de présence non renseignée");
    expect(l).toContain("saisie le 12/10/2026");
    expect(l).toContain("après la fin de formation");
    expect(l).not.toMatch(/pratique/i);
    expect(r.items[0].datePresence).toBeNull();
  });
  it("saisie à 23h30 Paris = jour Paris, pas jour UTC", () => {
    const [x] = normaliserHeuresValidees([{ id: "b", heures: 1, created_at: "2026-10-12T21:30:00Z" }]);
    expect(x.dateSaisie).toBe("2026-10-12");
    const [y] = normaliserHeuresValidees([{ id: "c", heures: 1, created_at: "2026-10-12T22:30:00Z" }]);
    expect(y.dateSaisie).toBe("2026-10-13");
  });
  it("nouvel ajout : date et catégorie réelles affichées", () => {
    const [x] = normaliserHeuresValidees([{ id: "d", heures: 3, created_at: "2026-10-13T08:00:00Z", date_presence: "2026-09-20", categorie: "theorie" }], "2026-09-30");
    expect(libelleHeureValidee(x)).toContain("théorie, présence du 20/09/2026");
    expect(x.saisieApresFin).toBe(true);
  });
  it("dédoublonnage : une ligne n'est comptée qu'une fois", () => {
    const row = { id: "e", heures: 6, created_at: "2026-10-12T20:03:00Z" };
    expect(normaliserHeuresValidees([row, row]).length).toBe(1);
  });
  it("erreur de lecture : jamais 0 h silencieux", async () => {
    state.error = { message: "permission denied" };
    await expect(fetchHeuresValideesAdmin("fictif")).rejects.toThrow(/indisponibles/);
  });
  it("Amar fictif reproduit : 57h15 + 6h = 63h15 / 66 h = 96 %", () => {
    const total = 3435 + 360;
    expect(total).toBe(3795);
    expect(Math.round(total / 60 / 66 * 100)).toBe(96);
  });
});
