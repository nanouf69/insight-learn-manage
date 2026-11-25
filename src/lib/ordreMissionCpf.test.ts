import { describe, it, expect } from "vitest";
import { creneauxMission, montantTtc, blocagesOrdre } from "./ordreMissionCpf";
const blocs = [{ semaine_debut: "2026-05-11", jour: 4, heure_debut: "14:00:00", heure_fin: "15:00:00", formation: "TAXI", discipline_nom: "Anglais" },
  { semaine_debut: "2026-03-16", jour: 4, heure_debut: "17:00:00", heure_fin: "18:00:00", formation: "VTC", discipline_nom: "Anglais" }];
describe("ordre de mission CPF", () => {
  it("réalisé seulement si émargé", () => {
    const c = creneauxMission(blocs, ["2026-05-15"], "2026-11-25");
    expect(c.map((x) => [x.date, x.etat])).toEqual([["2026-03-20", "prevu_non_prouve"], ["2026-05-15", "realise_emarge"]]);
  });
  it("50 € TTC par heure", () => expect(montantTtc(120)).toBe(100));
  it("bloqué sans signature centre ni financement", () => {
    const b = blocagesOrdre({ contratPrestataireSigne: true, contratCentreSigne: false, financementCpfConfirme: false, habilitationRequise: false, creneaux: [] });
    expect(b).toContain("Contrat-cadre non signé par SERVICES PRO");
    expect(b).toContain("Financement CPF non confirmé pour la session");
  });
});
