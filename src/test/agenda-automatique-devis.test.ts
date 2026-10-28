import { describe, it, expect } from "vitest";
import { agendaAutomatique } from "@/lib/programmeCalendrierDevis";

const s = (o: any) => ({ id: "x", nom: "Session", type_session: "formation", lieu: null, heure_debut: "09:00", heure_fin: "16:00", jours: [], ...o }) as any;

describe("agenda jour par jour du devis", () => {
  it("TAXI 4–22 janvier 2027 : 15 jours × 6 h = 90 h + 6 h pratique = 96 h", () => {
    const a = agendaAutomatique(s({ nom: "TAXI", date_debut: "2027-01-04", date_fin: "2027-01-22", heures_total: 90 }), "taxi", false);
    expect(a.lignes.filter((l) => l.nature === "Théorie")).toHaveLength(15);
    expect(a.total).toBe(96);
    expect(a.valide).toBe(true);
  });
  it("un jour férié (11 novembre) qui casse la durée donne un avertissement, jamais un jour inventé", () => {
    const a = agendaAutomatique(s({ nom: "VTC", date_debut: "2026-11-02", date_fin: "2026-11-13", heures_total: 60 }), "vtc", false);
    expect(a.lignes.some((l) => l.jour === "2026-11-11")).toBe(false);
    expect(a.valide).toBe(false);
  });
  it("pratique sans samedi dans la session : date à confirmer", () => {
    const a = agendaAutomatique(s({ nom: "TA", date_debut: "2027-01-04", date_fin: "2027-01-08", heures_total: 30 }), "ta", false);
    expect(a.lignes.find((l) => l.nature === "Pratique")?.jour).toBeNull();
  });
});
