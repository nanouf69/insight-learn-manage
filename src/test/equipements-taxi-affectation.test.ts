import { describe, it, expect } from "vitest";
import { modulesAttribuesDashboard, modulesExigesDashboard, equipementsTaxiAjoute } from "@/lib/parcoursModulesDashboard";

const TAXI_SANS_64 = [1, 10, 7, 3, 9, 13, 11, 36, 6, 84];
const TA_E_SANS_64 = [32, 40, 7, 3, 27, 13, 28, 37, 6];
const ids = (l: { id: number }[]) => l.map((m) => m.id);
const tousTermines = (l: number[], quand: string) => l.map((module_id) => ({ module_id, status: "completed", completed_at: quand }));

describe("Module 64 Équipements TAXI pour les TAXI/TA sans affectation explicite", () => {
  it("TAXI et TA : module 64 ajouté une seule fois, en fin de liste", () => {
    for (const [f, l] of [["taxi", TAXI_SANS_64], ["taxi-pour-vtc-elearning", TA_E_SANS_64]] as const) {
      const r = ids(modulesAttribuesDashboard(f, [...l]));
      expect(r.filter((x) => x === 64)).toHaveLength(1);
      expect(r[r.length - 1]).toBe(64);
    }
  });
  it("déjà affecté : aucun doublon, ordre inchangé", () => {
    const l = [1, 10, 7, 64, 3, 9, 13, 11, 36, 6, 84];
    expect(equipementsTaxiAjoute("taxi", l)).toBe(false);
    expect(ids(modulesAttribuesDashboard("taxi", l)).filter((x) => x === 64)).toHaveLength(1);
  });
  it("VTC / VA : jamais ajouté", () => {
    expect(ids(modulesAttribuesDashboard("vtc-elearning", [26, 2, 3, 4, 35, 5, 8]))).not.toContain(64);
    expect(ids(modulesAttribuesDashboard("vtc-pour-taxi", [33, 41, 3, 29, 30, 38, 8, 83]))).not.toContain(64);
  });
  it("parcours terminé avant la borne : 64 consultable mais non exigé", () => {
    const c = tousTermines(TAXI_SANS_64, "2026-10-20T10:00:00Z");
    expect(ids(modulesExigesDashboard("taxi", TAXI_SANS_64, c, "2027-01-31"))).not.toContain(64);
    expect(ids(modulesAttribuesDashboard("taxi", TAXI_SANS_64))).toContain(64);
  });
  it("accès terminé avant la borne : non exigé", () => {
    expect(ids(modulesExigesDashboard("taxi", TAXI_SANS_64, [], "2026-10-01"))).not.toContain(64);
  });
  it("parcours en cours : 64 exigé", () => {
    const c = tousTermines(TAXI_SANS_64.slice(0, 4), "2026-10-20T10:00:00Z");
    expect(ids(modulesExigesDashboard("taxi", TAXI_SANS_64, c, "2027-01-31"))).toContain(64);
  });
  it("dernier module validé après la borne : 64 exigé", () => {
    const c = tousTermines(TAXI_SANS_64, "2026-10-20T10:00:00Z").map((x, i) => i === 0 ? { ...x, completed_at: "2026-11-02T10:00:00Z" } : x);
    expect(ids(modulesExigesDashboard("taxi-pour-vtc-elearning", TA_E_SANS_64, c, "2027-01-31"))).toContain(64);
  });
  it("64 déjà terminé : compté normalement", () => {
    const c = [...tousTermines(TAXI_SANS_64, "2026-10-20T10:00:00Z"), { module_id: 64, status: "completed", completed_at: "2026-10-21T10:00:00Z" }];
    expect(ids(modulesExigesDashboard("taxi", TAXI_SANS_64, c, "2027-01-31"))).toContain(64);
  });
});
