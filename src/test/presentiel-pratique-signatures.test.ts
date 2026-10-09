// @vitest-environment node
import { describe, expect, it } from "vitest";
import { computePresentielHours, presentielProgress } from "../lib/presentielHours";
import { resolvePratiqueSlotParts, type PratiqueSlotDetail } from "../lib/pratiqueSlots";

const date = "2026-10-09";
const signed = (slot: string) => ({ date_emargement: date, demi_journee: slot, signature_data_url: "data:image/png;base64,fictif", absent: false });
function planning(type: "vtc" | "taxi", apresmidi = "13h-16h"): PratiqueSlotDetail[] {
  const parts = resolvePratiqueSlotParts({ matin: "9h-12h", apresmidi }, type);
  return [{ date, typeFormation: type, reservationCreneau: "journee", parts, minutes: parts.reduce((s, p) => s + p.minutes, 0), label: "Pratique" }];
}
describe("Présence pratique prouvée par signature", () => {
  it.each(["vtc", "taxi"] as const)("compte 3h puis 6h en présentiel %s", (type) => {
    const details = planning(type);
    expect(computePresentielHours([signed("apres_midi")], details)).toEqual({ theorieHours: 0, pratiqueMinutes: 180 });
    expect(computePresentielHours([signed("matin"), signed("apres_midi")], details)).toEqual({ theorieHours: 0, pratiqueMinutes: 360 });
  });
  it("ne compte ni feuille vierge ni absence ni feuille masquée", () => {
    const rows = [
      { ...signed("matin"), signature_data_url: null },
      { ...signed("matin"), signature_data_url: " " },
      { ...signed("apres_midi"), absent: true },
      { ...signed("matin"), masque: true },
    ];
    expect(computePresentielHours(rows, planning("vtc"))).toEqual({ theorieHours: 0, pratiqueMinutes: 0 });
  });
  it("respecte les horaires personnalisés et évite le double comptage", () => {
    const details = planning("taxi", "13h30-17h");
    expect(computePresentielHours([signed("apres_midi"), signed("apres_midi")], [...details, ...details]).pratiqueMinutes).toBe(210);
  });
  it("conserve la soirée théorique du même jour séparément", () => {
    expect(computePresentielHours([signed("matin"), signed("apres_midi"), signed("soir_1"), signed("soir_2")], planning("vtc"))).toEqual({ theorieHours: 4, pratiqueMinutes: 360 });
  });
  it.each(["VTC", "TAXI", "VA", "TA"])("affiche une pratique à 50 puis 100%% même sans volume contractuel (%s)", () => {
    expect(presentielProgress(3, 0, planning("vtc"))).toEqual({ done: 3, required: 6, pct: 50 });
    expect(presentielProgress(6, 0, planning("vtc"))).toEqual({ done: 6, required: 6, pct: 100 });
  });
  it("garde le volume contractuel quand il existe sans effacer les heures prouvées", () => {
    expect(presentielProgress(6, 30, planning("vtc"))).toEqual({ done: 6, required: 30, pct: 20 });
    expect(presentielProgress(8, 6, planning("vtc"))).toEqual({ done: 8, required: 6, pct: 100 });
  });
  it("une réservation seule reste à zéro et ne modifie aucune donnée", () => {
    const details = planning("vtc");
    const before = JSON.stringify(details);
    expect(computePresentielHours([], details)).toEqual({ theorieHours: 0, pratiqueMinutes: 0 });
    expect(presentielProgress(0, 0, details).pct).toBe(0);
    expect(JSON.stringify(details)).toBe(before);
  });
});