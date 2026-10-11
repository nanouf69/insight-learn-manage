import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { GRILLE_JALONS, calculerJalonsPonderes, filiereDuParcours } from "@/lib/jalonsPonderes";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";

const ids = (k: string) => FORMATION_MODULES[k].modules.map((m) => m.id);
const all = (k: string) => ids(k).map((id) => ({ module_id: id, status: "completed" }));

describe("jalons pondérés", () => {
  it("chaque grille somme 100", () => {
    for (const g of Object.values(GRILLE_JALONS)) expect(Math.round(Object.values(g).reduce((a, b) => a + b, 0) * 10) / 10).toBe(100);
  });
  it("0 partout => 0", () => expect(calculerJalonsPonderes("vtc", ids("vtc-e"), []).taux).toBe(0));
  it("VTC cours 50 % => 21 pts", () => expect(calculerJalonsPonderes("vtc", ids("vtc-e"), [{ module_id: 2, status: "in_progress", progress: 50 }]).taux).toBe(21));
  it("tout terminé + fin validée => 100", () => {
    for (const k of ["vtc", "vtc-e", "taxi", "taxi-e-presentiel", "ta", "ta-e", "va", "va-e"]) expect(calculerJalonsPonderes(filiereDuParcours(k)!, ids(k), all(k)).taux).toBe(100);
  });
  it("pédagogique 100 mais fin non validée => < 100", () => {
    const r = calculerJalonsPonderes("vtc", ids("vtc-e"), all("vtc-e").filter((c) => c.module_id !== 50));
    expect(r.taux).toBe(99.9);
    expect(r.jalonsObligatoiresManquants).toContain(50);
  });
  it("module absent du parcours : pas de renormalisation", () => {
    const parcours = ids("vtc-e").filter((id) => id !== 35);
    const r = calculerJalonsPonderes("vtc", parcours, parcours.map((id) => ({ module_id: id, status: "completed" })));
    expect(r.taux).toBeCloseTo(88.6, 1);
  });
  it("alias filière et intro équivalente", () => {
    expect(filiereDuParcours("ta-e-presentiel")).toBe("ta");
    expect(filiereDuParcours("continue-vtc")).toBeNull();
    expect(filiereDuParcours("mobilite-taxi")).toBeNull();
    expect(calculerJalonsPonderes("ta", ids("ta"), [{ module_id: 31, status: "completed" }]).taux).toBe(3.4);
  });
  it("tentative répétée n'ajoute rien", () => {
    const r = calculerJalonsPonderes("vtc", ids("vtc-e"), [{ module_id: 2, status: "in_progress", progress: 50 }, { module_id: 2, status: "in_progress", progress: 50 }]);
    expect(r.taux).toBe(21);
  });
  it("carte réservée admin (contrôle user_roles) et absente du côté apprenant", () => {
    const src = readFileSync("src/components/crm/apprenant-sections/JalonsPonderesCard.tsx", "utf8");
    expect(src).toMatch(/user_roles[\s\S]*eq\("role", "admin"\)/);
    expect(src).toMatch(/if \(!isAdmin/);
    const pub = readFileSync("src/pages/CoursPublic.tsx", "utf8");
    expect(pub).not.toMatch(/JalonsPonderes/);
  });
});
