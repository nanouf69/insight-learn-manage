import { describe, it, expect } from "vitest";
import { activitesDuModule, activitesRequisesModule, activiteHorsVolume, completionAvecActivites, BORNE_EQUIPEMENTS_TAXI_LOCALE } from "@/lib/jeuxPedagogiques";
import { QUESTIONS_EQUIPEMENTS, ID_QUIZ_EQUIPEMENTS, quizEquipementsComplet } from "@/components/cours-en-ligne/equipements-taxi-locale/donnees";
import { accuseEquipementsCorrespond } from "@/components/cours-en-ligne/equipements-taxi-locale/useQuizEquipements";

const act = () => activitesDuModule(10).find((a) => a.id === ID_QUIZ_EQUIPEMENTS)!;
const avant = { status: "completed", completed_at: "2026-10-20T10:00:00Z" };
const apres = { status: "completed", completed_at: "2026-11-02T10:00:00Z" };

describe("Quiz Équipements TAXI — partie locale module 10", () => {
  it("est rattaché au module 10 uniquement", () => {
    expect(act().moduleId).toBe(10);
    expect(activitesDuModule(64).some((a) => a.id === ID_QUIZ_EQUIPEMENTS)).toBe(false);
  });
  it("n'est pas exigé pour un module terminé avant l'ajout", () => {
    expect(activitesRequisesModule(10, avant).some((a) => a.id === ID_QUIZ_EQUIPEMENTS)).toBe(false);
  });
  it("est exigé pour un module en cours", () => {
    expect(activitesRequisesModule(10, { status: "in_progress", completed_at: null }).some((a) => a.id === ID_QUIZ_EQUIPEMENTS)).toBe(true);
  });
  it("est exigé pour un module validé après l'ajout", () => {
    expect(activitesRequisesModule(10, apres).some((a) => a.id === ID_QUIZ_EQUIPEMENTS)).toBe(true);
  });
  it("sort du volume (durée/poids) pour un module terminé avant, pas après", () => {
    expect(activiteHorsVolume(act(), avant)).toBe(true);
    expect(activiteHorsVolume(act(), { status: "completed", completed_at: null })).toBe(true);
    expect(activiteHorsVolume(act(), apres)).toBe(false);
    expect(activiteHorsVolume(act(), { status: "in_progress" })).toBe(false);
  });
  it("module terminé avant : reste terminé à 100 %", () => {
    const r = completionAvecActivites({ module_id: 10, status: "completed", progress: 100, completed_at: avant.completed_at } as any, { pages: 10, questions: 50 } as any, [act()], new Set());
    expect(r.completion.status).toBe("completed");
    expect(r.completion.progress).toBe(100);
  });
  it("borne = horodatage de la demande", () => {
    expect(BORNE_EQUIPEMENTS_TAXI_LOCALE).toBe("2026-10-27T13:52:00Z");
  });
  it("15 questions, choix valides, IDs uniques, aucun montant « à vérifier DDPP »", () => {
    expect(QUESTIONS_EQUIPEMENTS).toHaveLength(15);
    expect(act().unites).toBe(15);
    expect(new Set(QUESTIONS_EQUIPEMENTS.map((q) => q.id)).size).toBe(15);
    for (const q of QUESTIONS_EQUIPEMENTS) {
      expect(q.choix).toHaveLength(3);
      expect(q.correct).toBeLessThan(q.choix.length);
      expect(JSON.stringify(q)).not.toMatch(/DDPP|à vérifier/i);
    }
  });
  it("terminer exige les 15 réponses", () => {
    const toutes = Object.fromEntries(QUESTIONS_EQUIPEMENTS.map((q) => [q.id, "0"]));
    expect(quizEquipementsComplet(toutes)).toBe(true);
    const { q15: _, ...sauf } = toutes;
    expect(quizEquipementsComplet(sauf)).toBe(false);
    expect(quizEquipementsComplet({ ...toutes, q01: "3" })).toBe(false);
  });
  it("accusé : terminé seulement si le serveur relit la même révision terminée", () => {
    const draft = { valeurs: { q01: "0" }, revision: "r1" };
    const row = { completed: true, reponses: { version: "2026-10-27-v1", revision: "r1", valeurs: { q01: "0" } } };
    expect(accuseEquipementsCorrespond(row, draft, true)).toBe(true);
    expect(accuseEquipementsCorrespond({ ...row, completed: false }, draft, true)).toBe(false);
    expect(accuseEquipementsCorrespond({ ...row, reponses: { ...row.reponses, revision: "r0" } }, draft, true)).toBe(false);
  });
});
