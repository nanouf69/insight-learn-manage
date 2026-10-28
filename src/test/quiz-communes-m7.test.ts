import { describe, it, expect } from "vitest";
import { QUESTIONS_METROPOLE, QUESTIONS_ZUPC, COMMUNES_METROPOLE, COMMUNES_ZUPC } from "@/components/cours-en-ligne/equipements-taxi-locale/donneesCommunes";
import { activitesDuModule, activitesRequisesModule, activiteHorsVolume } from "@/lib/jeuxPedagogiques";

describe("quiz communes module 7", () => {
  it("les deux nouveaux quiz n'ajoutent ni exigence ni volume aux modules déjà terminés", () => {
    const termine = { status: "completed", completed_at: "2026-10-28T14:16:59Z" };
    const activites = activitesDuModule(7);
    expect(activites).toHaveLength(2);
    expect(activitesRequisesModule(7, termine)).toEqual([]);
    expect(activites.filter((a) => !activiteHorsVolume(a, termine)).reduce((n, a) => n + a.unites, 0)).toBe(0);
  });
  it("une validation ancienne sans date conserve aussi ses jalons", () => {
    const termine = { status: "completed", completed_at: null };
    expect(activitesRequisesModule(7, termine)).toEqual([]);
    expect(activitesDuModule(7).every((a) => activiteHorsVolume(a, termine))).toBe(true);
  });
  it("58 questions, une par commune de la Métropole, bonne réponse = la commune", () => {
    expect(QUESTIONS_METROPOLE).toHaveLength(58);
    expect(new Set(QUESTIONS_METROPOLE.map((q) => q.choix[q.correct]))).toEqual(new Set(COMMUNES_METROPOLE));
  });
  it("ZUPC = 23 communes + aéroport, intrus jamais dans la ZUPC", () => {
    expect(QUESTIONS_ZUPC).toHaveLength(24);
    expect(COMMUNES_ZUPC).toContain("Aéroport de Lyon-Saint-Exupéry");
    for (const q of QUESTIONS_ZUPC) q.choix.forEach((c, i) => i !== q.correct && expect(COMMUNES_ZUPC).not.toContain(c));
  });
  it("intrus Métropole jamais membres", () => {
    for (const q of QUESTIONS_METROPOLE) q.choix.forEach((c, i) => i !== q.correct && expect(COMMUNES_METROPOLE).not.toContain(c));
  });
});
