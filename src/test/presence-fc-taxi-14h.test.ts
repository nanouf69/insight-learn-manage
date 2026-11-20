// @vitest-environment node
import { describe, it, expect } from "vitest";
import { calculerTauxPresenceHeures } from "../components/crm/TauxPresenceSessionsCard";

const fc = { id: "fc-taxi", nom: "Formation Continue TAXI - 19 et 20 novembre 2026", type_session: "theorique", statut: "planifiee", date_debut: "2026-11-19", date_fin: "2026-11-20", heure_debut: "09:00", heure_fin: "17:00" };
const sig = (date: string, demi_journee: string) => ({ date_emargement: date, demi_journee, signature_data_url: "data:image/png;base64,AAAA" });
const quatre = [sig("2026-11-19", "matin"), sig("2026-11-19", "apres_midi"), sig("2026-11-20", "matin"), sig("2026-11-20", "apres_midi")];

describe("FC TAXI 9h–12h / 13h–17h", () => {
  it("4 demi-journées signées sur 2 jours = 14 h, pas 12 h", () => {
    expect(calculerTauxPresenceHeures(quatre, [{ session_id: "fc-taxi", sessions: fc }], "taxi").session.faites).toBe(14);
  });
  it("un après-midi FC non signé n'est jamais compté", () => {
    expect(calculerTauxPresenceHeures(quatre.slice(0, 3), [{ session_id: "fc-taxi", sessions: fc }], "taxi").session.faites).toBe(10);
  });
  it("la formation initiale garde 3 h l'après-midi (13h–16h)", () => {
    const init = { ...fc, id: "init", nom: "Session TAXI", heure_fin: "16:00" };
    expect(calculerTauxPresenceHeures(quatre, [{ session_id: "init", sessions: init }], "taxi").session.faites).toBe(12);
  });
});
