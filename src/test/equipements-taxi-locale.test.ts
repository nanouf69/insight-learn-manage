import { describe, it, expect } from "vitest";
import { activitesDuModule, activitesRequisesModule, activiteHorsVolume, completionAvecActivites, BORNE_EQUIPEMENTS_TAXI_M64 } from "@/lib/jeuxPedagogiques";
import { QUESTIONS_EQUIPEMENTS, ID_QUIZ_EQUIPEMENTS, VERSION_QUIZ_EQUIPEMENTS, quizEquipementsComplet } from "@/components/cours-en-ligne/equipements-taxi-locale/donnees";
import { accuseEquipementsCorrespond } from "@/components/cours-en-ligne/equipements-taxi-locale/useQuizEquipements";

const act = () => activitesDuModule(64).find((a) => a.id === ID_QUIZ_EQUIPEMENTS)!;
const avant = { status: "completed", completed_at: "2026-10-20T10:00:00Z" };
const apres = { status: "completed", completed_at: "2026-11-02T10:00:00Z" };

describe("Quiz Équipements TAXI — module 64 questions complémentaires", () => {
  it("est rattaché au module 64 uniquement (rien dans le module 10)", () => {
    expect(act().moduleId).toBe(64);
    expect(activitesDuModule(10).some((a) => /equipements/.test(a.id))).toBe(false);
  });
  it("n'est pas exigé pour un module terminé avant l'ajout", () => {
    expect(activitesRequisesModule(64, avant).some((a) => a.id === ID_QUIZ_EQUIPEMENTS)).toBe(false);
  });
  it("est exigé pour un module en cours", () => {
    expect(activitesRequisesModule(64, { status: "in_progress", completed_at: null }).some((a) => a.id === ID_QUIZ_EQUIPEMENTS)).toBe(true);
  });
  it("est exigé pour un module validé après l'ajout", () => {
    expect(activitesRequisesModule(64, apres).some((a) => a.id === ID_QUIZ_EQUIPEMENTS)).toBe(true);
  });
  it("sort du volume (durée/poids) pour un module terminé avant, pas après", () => {
    expect(activiteHorsVolume(act(), avant)).toBe(true);
    expect(activiteHorsVolume(act(), { status: "completed", completed_at: null })).toBe(true);
    expect(activiteHorsVolume(act(), apres)).toBe(false);
    expect(activiteHorsVolume(act(), { status: "in_progress" })).toBe(false);
  });
  it("module terminé avant : reste terminé à 100 %", () => {
    const r = completionAvecActivites({ module_id: 64, status: "completed", progress: 100, completed_at: avant.completed_at } as any, { pages: 1, questions: 10 } as any, [act()], new Set());
    expect(r.completion.status).toBe("completed");
    expect(r.completion.progress).toBe(100);
  });
  it("borne = horodatage de la demande", () => {
    expect(BORNE_EQUIPEMENTS_TAXI_M64).toBe("2026-10-27T14:11:00Z");
  });
  it("11 questions, choix valides, IDs uniques, aucun montant « à vérifier DDPP »", () => {
    expect(QUESTIONS_EQUIPEMENTS).toHaveLength(11);
    expect(act().unites).toBe(11);
    expect(new Set(QUESTIONS_EQUIPEMENTS.map((q) => q.id)).size).toBe(11);
    for (const q of QUESTIONS_EQUIPEMENTS) {
      expect(q.choix).toHaveLength(3);
      expect(q.correct).toBeLessThan(q.choix.length);
      expect(JSON.stringify(q)).not.toMatch(/DDPP|à vérifier/i);
    }
  });
  it("terminer exige les 11 réponses", () => {
    const toutes = Object.fromEntries(QUESTIONS_EQUIPEMENTS.map((q) => [q.id, "0"]));
    expect(quizEquipementsComplet(toutes)).toBe(true);
    const { q11: _, ...sauf } = toutes;
    expect(quizEquipementsComplet(sauf)).toBe(false);
    expect(quizEquipementsComplet({ ...toutes, q01: "3" })).toBe(false);
  });
  it("accusé : terminé seulement si le serveur relit la même révision terminée", () => {
    const draft = { valeurs: { q01: "0" }, revision: "r1" };
    const row = { completed: true, reponses: { version: VERSION_QUIZ_EQUIPEMENTS, revision: "r1", valeurs: { q01: "0" } } };
    expect(accuseEquipementsCorrespond(row, draft, true)).toBe(true);
    expect(accuseEquipementsCorrespond({ ...row, completed: false }, draft, true)).toBe(false);
    expect(accuseEquipementsCorrespond({ ...row, reponses: { ...row.reponses, revision: "r0" } }, draft, true)).toBe(false);
  });
  it("les 10 questions existantes du module 64 restent intactes", async () => {
    const { EQUIPEMENTS_TAXI_DATA } = await import("@/components/cours-en-ligne/equipements-taxi-data");
    const ex = (EQUIPEMENTS_TAXI_DATA as any).exercices;
    expect(ex).toHaveLength(1);
    expect(ex[0].id).toBe(64100);
    expect(ex[0].questions.map((q: any) => q.id)).toEqual([1,2,3,4,5,6,7,8,9,10]);
  });
  it("support du cours 64001 remplacé par le PowerPoint, identité conservée ; autres cours inchangés", async () => {
    const { projeterSupportTaxi } = await import("@/lib/taxiReglementationSupports");
    const c = { id: 64001, titre: "T", fichiers: [{ nom: "ancien", url: "/cours/vtc/Equipements_et_documents_TAXI.pdf" }] };
    const r = projeterSupportTaxi(64, c);
    expect(r.id).toBe(64001);
    expect(r.fichiers!.map((f) => f.url)).toEqual(["/cours/taxi/F_Locale_Equipements_documents_TAXI.pdf?v=20261027", "/cours/taxi/F_Locale_Equipements_documents_TAXI.pptx?v=20261027"]);
    expect(projeterSupportTaxi(10, c)).toBe(c);
    expect(projeterSupportTaxi(64, { ...c, id: 64002 }).fichiers![0].nom).toBe("ancien");
  });
});
