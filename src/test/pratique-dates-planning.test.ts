import { describe, expect, it } from "vitest";
import { calculerTauxPresenceHeures } from "../components/crm/TauxPresenceSessionsCard";

describe("Dates nominatives d’entraînement au planning", () => {
  it("affiche une réservation même sans session inscrite sans inventer de présence", () => {
    const resultat = calculerTauxPresenceHeures([], [], "vtc", [
      { date_choisie: "2026-11-10", type_formation: "vtc" },
    ]);
    expect(resultat.pratique.datesEntrainement).toEqual(["2026-11-10"]);
    expect(resultat.pratique.faites).toBe(0);
    expect(resultat.pratique.prevues).toBe(0);
    expect(resultat.pratique.derniere).toBeUndefined();
  });
  it("conserve plusieurs dates, dédoublonne et ignore une date non renseignée", () => {
    const reservations = [{ date_choisie: "2026-11-12" }, { date_choisie: "2026-11-10" }, { date_choisie: "2026-11-12" }, { date_choisie: null }];
    const avant = JSON.stringify(reservations);
    expect(calculerTauxPresenceHeures([], [], "taxi", reservations).pratique.datesEntrainement).toEqual(["2026-11-10", "2026-11-12"]);
    expect(JSON.stringify(reservations)).toBe(avant);
  });
  it("ne transforme pas les jours théoriques en entraînement pratique", () => {
    const inscriptions = [{ sessions: { type_session: "theorique", date_debut: "2026-11-09", date_fin: "2026-11-13" } }];
    expect(calculerTauxPresenceHeures([], inscriptions, "vtc").pratique.datesEntrainement).toEqual([]);
  });
});