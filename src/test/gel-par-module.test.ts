// Données fictives uniquement — aucune écriture.
import { describe, it, expect } from "vitest";
import { progressionModulesEleve } from "@/lib/progressionModulesEleve";
import { ACTIVITES_CODE, completionAvecActivites, activitesRequisesModule, instantValidationModule } from "@/lib/jeuxPedagogiques";
import { etatFormation } from "@/components/cours-en-ligne/StudentHoursTracker";

const AJOUT = "2026-10-13T10:41:00Z";
const AVANT = "2026-10-01T08:00:00Z", APRES = "2026-10-14T08:00:00Z";
const mods = [{ id: 1, nom: "Intro" }, { id: 8, nom: "PRATIQUE VTC" }];
const jeux8 = ACTIVITES_CODE.filter(a => a.moduleId === 8);

describe("Gel par module (règle 15/10/2026)", () => {
  it("module 8 validé avant l'ajout des jeux : reste terminé, jeux non exigés", () => {
    const p: any = progressionModulesEleve(mods, (id) => id === 8, new Set(), APRES, "fictif-A", [{ module_id: 8, status: "completed", completed_at: AVANT }]);
    expect(p.restants.map((r: any) => r.id)).toEqual([1]); // autre module reste ouvert
    expect(p.termines).toBe(1);
  });
  it("module validé APRÈS l'ajout : jeux encore exigés (contenu courant connu à la validation)", () => {
    const p: any = progressionModulesEleve(mods, () => true, new Set(), APRES, "fictif-B", [{ module_id: 8, status: "completed", completed_at: "2026-10-13T12:00:00Z" }]);
    expect(p.restants[0]).toMatchObject({ id: 8, raison: "nouvelles_activites" });
  });
  it("completed sans date lisible : aucune date inventée, validation conservée", () => {
    expect(instantValidationModule({ status: "completed", completed_at: null })).toBeNull();
    expect(instantValidationModule({ status: "completed", completed_at: "pas-une-date" })).toBeNull();
    expect(activitesRequisesModule(8, { status: "completed", completed_at: null }, APRES)).toHaveLength(0);
  });
  it("module en cours : recalcul avec le contenu courant (jeux exigés)", () => {
    expect(activitesRequisesModule(8, { status: "in_progress", completed_at: AVANT }, APRES)).toHaveLength(2);
    const r = completionAvecActivites({ module_id: 8, status: "in_progress", progress: 100 } as any, { moduleId: 8, pages: 1, questions: 4 } as any, jeux8, new Set());
    expect(r.completion.status).toBe("in_progress");
  });
  it("jalon : module validé puis jeux ajoutés => 100 % acquis, volume courant conservé", () => {
    const r = completionAvecActivites({ module_id: 8, status: "completed", completed_at: AVANT } as any, { moduleId: 8, pages: 1, questions: 4 } as any, jeux8, new Set());
    expect(r.completion).toMatchObject({ status: "completed", progress: 100 });
    expect(r.etat.ajouteesApresValidation).toEqual(jeux8.map(j => j.id));
    expect(r.etat.termines).toEqual([]); // jamais marqués « faits »
    expect(r.etat.versionAnterieureValidee).toBe(false);
  });
  it("deux élèves indépendants sur le même appareil (aucun état partagé)", () => {
    const a: any = progressionModulesEleve(mods, () => true, new Set(), APRES, "A", [{ module_id: 8, status: "completed", completed_at: AVANT }]);
    const b: any = progressionModulesEleve(mods, () => true, new Set(), APRES, "B", []);
    const a2: any = progressionModulesEleve(mods, () => true, new Set(), APRES, "A", [{ module_id: 8, status: "completed", completed_at: AVANT }]);
    expect([a.termines, b.termines, a2.termines]).toEqual([2, 1, 2]); // rechargement = même résultat
  });
  it("jeu terminé après gel : enregistré mais sans effet sur l'acquis", () => {
    const r = completionAvecActivites({ module_id: 8, status: "completed", completed_at: AVANT } as any, { moduleId: 8, pages: 1, questions: 4 } as any, jeux8, new Set([jeux8[0].id]));
    expect(r.completion.progress).toBe(100); expect(r.etat.termines).toEqual([jeux8[0].id]);
  });
  it("heures non figées par la validation des modules : seules les heures décident", () => {
    expect(etatFormation(80, 12, 12)).toBe("en_cours");
    expect(etatFormation(100, 12, 12)).toBe("terminee");
  });
  it("borne d'ajout exacte : activité ajoutée à l'instant de validation = exigée", () => {
    expect(activitesRequisesModule(8, { status: "completed", completed_at: AJOUT }, APRES)).toHaveLength(2);
  });
});
