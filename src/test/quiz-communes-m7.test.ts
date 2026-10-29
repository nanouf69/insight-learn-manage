import { describe, it, expect } from "vitest";
import { QUESTIONS_METROPOLE, QUESTIONS_ZUPC, COMMUNES_METROPOLE, COMMUNES_ZUPC } from "@/components/cours-en-ligne/equipements-taxi-locale/donneesCommunes";
import { activitesDuModule, activitesRequisesModule, activiteHorsVolume } from "@/lib/jeuxPedagogiques";
import { module7CommunePanel } from "@/lib/module7ActivitiesDisplay";
import { activitesModuleEleve, statutActiviteEleve, jeuxRestants } from "@/lib/activitesModuleEleve";

describe("quiz communes module 7", () => {
  it("les quiz non réalisés restent signalés même facultatifs, sans rouvrir les jalons", () => {
    const e = activitesModuleEleve(7, [{ id: 7 }], [{ module_id: 7, status: "completed", completed_at: "2026-10-26T09:00:00Z" }], new Set());
    expect(e.etat).toBe("ok");
    if (e.etat !== "ok") throw new Error("Activités absentes");
    expect(e.facultatives).toHaveLength(2);
    for (const a of e.facultatives) {
      expect(statutActiviteEleve(e, a.id)).toMatchObject({ termine: false, facultatif: true, nonRealise: true });
    }
    expect(jeuxRestants(e)).toBe(0);
    const id = e.facultatives[0].id;
    const soumis = activitesModuleEleve(7, [{ id: 7 }], [{ module_id: 7, status: "completed", completed_at: "2026-10-26T09:00:00Z" }], new Set([id]));
    expect(statutActiviteEleve(soumis, id)).toMatchObject({ termine: true, nonRealise: false });
  });
  it("lecture impossible ou activité absente ne signifie pas non réalisé", () => {
    expect(statutActiviteEleve(null, "quiz").nonRealise).toBe(false);
    expect(statutActiviteEleve({ etat: "indisponible", requises: [] }, "quiz").connu).toBe(false);
  });
  it("seules les étapes communes affichent leur propre panneau, jamais Musées/Consulats/Hôpitaux/jeux", () => {
    expect(module7CommunePanel(7, 7020)).toBe(7020);
    expect(module7CommunePanel(7, 7021)).toBe(7021);
    for (const id of [7004, 7003, 7002, 7001, 17, 18, 19, 20, 21, null]) {
      expect(module7CommunePanel(7, id)).toBeNull();
    }
    expect(module7CommunePanel(8, 7020)).toBeNull();
  });
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
