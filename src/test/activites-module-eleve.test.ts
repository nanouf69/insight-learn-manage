import { describe, it, expect } from "vitest";
import { activitesModuleEleve, libelleJeux, jeuxRestants } from "@/lib/activitesModuleEleve";
import { libelleFinQuiz } from "@/components/cours-en-ligne/ActivitesModuleStatut";
import { progressionModulesEleve } from "@/lib/progressionModulesEleve";
import { IDS_JEUX_LYON } from "@/lib/jeuxPedagogiques";

// Données fictives calquées sur le cas confirmé (module 8 validé le 15/10, jeux ajoutés le 13/10).
const parcours = [{ id: 1, nom: "Intro" }, { id: 8, nom: "PRATIQUE VTC" }];
const apresJeux = [{ module_id: 1, status: "completed", completed_at: "2026-10-01T10:00:00Z" }, { module_id: 8, status: "completed", completed_at: "2026-10-15T11:43:47Z" }] as any;
const avantJeux = [{ module_id: 1, status: "in_progress", completed_at: null }, { module_id: 8, status: "completed", completed_at: "2026-10-10T09:00:00Z" }] as any;
const D = "2026-10-19T12:00:00Z";

describe("Jeux du module — présentation élève partagée", () => {
  it("validé après l'ajout : 0/2, 2 jeux à faire, badge À terminer", () => {
    const e = activitesModuleEleve(8, parcours, apresJeux, new Set(), "fictif", D);
    expect(libelleJeux(e)).toBe("Jeux : 0/2 terminé — 2 jeux à faire");
    expect(jeuxRestants(e)).toBe(2);
    expect(libelleFinQuiz(e).bouton).toBe("Quiz terminé — 2 jeux restants");
  });
  it("même règle que le compteur d'accueil (pourcentages inchangés)", () => {
    const p: any = progressionModulesEleve(parcours, () => true, new Set(), D, "fictif", apresJeux);
    expect(p.restants.map((r: any) => r.id)).toEqual([8]);
    const p2: any = progressionModulesEleve(parcours, () => true, new Set(IDS_JEUX_LYON), D, "fictif", apresJeux);
    expect(p2.termines).toBe(2);
    expect(jeuxRestants(activitesModuleEleve(8, parcours, apresJeux, new Set(IDS_JEUX_LYON), "fictif", D))).toBe(0);
  });
  it("validé avant l'ajout : jeux facultatifs, rien à terminer, bouton Terminé", () => {
    const e: any = activitesModuleEleve(8, parcours, avantJeux, new Set(), "fictif", D);
    expect(e.requises).toEqual([]); expect(e.facultatives).toHaveLength(2);
    expect(jeuxRestants(e)).toBe(0); expect(libelleFinQuiz(e).bouton).toBe("Terminé");
  });
  it("lecture échouée : indisponible, jamais 0/2", () => {
    const e = activitesModuleEleve(8, parcours, apresJeux, null, "fictif", D);
    expect(e.etat).toBe("indisponible"); expect(libelleJeux(e)).not.toContain("0/2");
    expect(libelleFinQuiz(e).bouton).toBe("Terminé");
  });
  it("dispense individuelle : aucun jeu exigé", () => {
    const e: any = activitesModuleEleve(8, parcours, apresJeux, new Set(), "4c75ae96-9d4d-4c6f-8097-dd59d27fe9f5", D);
    expect(e.requises).toEqual([]);
  });
  it("module sans jeux : rien affiché", () => {
    expect(libelleJeux(activitesModuleEleve(1, parcours, apresJeux, new Set(), "fictif", D))).toBeNull();
  });
});
