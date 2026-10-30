import { describe, it, expect } from "vitest";
import { anomaliesEntrainementExamen } from "@/lib/entrainementSansExamen";
const r = [{ apprenant_id: "a", date_choisie: "2026-10-13" }, { apprenant_id: "b", date_choisie: "2026-10-13" }, { apprenant_id: "c", date_choisie: "2026-10-13" }];
const apps = [{ id: "a", prenom: "A", nom: "x", date_examen_pratique: null }, { id: "b", prenom: "B", nom: "y", date_examen_pratique: "2026-11-02" }, { id: "c", prenom: "C", nom: "z", date_examen_pratique: "2026-10-01" }];
describe("entraînement sans examen", () => {
  it("signale sans examen et examen avant l'entraînement", () => {
    expect(anomaliesEntrainementExamen(r, apps, []).map(a => a.id)).toEqual(["a", "c"]);
  });
  it("une ligne CMA après l'entraînement suffit", () => {
    expect(anomaliesEntrainementExamen(r, apps, [{ apprenant_id: "a", date_examen: "2026-11-03" }]).map(a => a.id)).toEqual(["c"]);
  });
});
