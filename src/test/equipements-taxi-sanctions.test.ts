import { describe, it, expect } from "vitest";
import { QUESTIONS_SANCTIONS, ID_QUIZ_SANCTIONS } from "@/components/cours-en-ligne/equipements-taxi-locale/donneesSanctions";
import { QUESTIONS_EQUIPEMENTS } from "@/components/cours-en-ligne/equipements-taxi-locale/donnees";
import { activitesDuModule, activitesRequisesModule } from "@/lib/jeuxPedagogiques";

describe("Module 64 — série usage/emplacement/sanctions", () => {
  it("contient au moins 20 questions, 3 choix, bonne réponse valide", () => {
    expect(QUESTIONS_SANCTIONS.length).toBeGreaterThanOrEqual(20);
    for (const q of QUESTIONS_SANCTIONS) { expect(q.choix).toHaveLength(3); expect(q.correct).toBeLessThan(3); }
  });
  it("aucun énoncé repris des 11 questions existantes", () => {
    const e = new Set(QUESTIONS_EQUIPEMENTS.map((q) => q.enonce));
    expect(QUESTIONS_SANCTIONS.some((q) => e.has(q.enonce))).toBe(false);
  });
  it("registre : 20 unités pour le module 64", () => {
    expect(activitesDuModule(64).find((a) => a.id === ID_QUIZ_SANCTIONS)?.unites).toBe(20);
  });
  it("module validé avant 27/10 17:11 UTC : pas exigée", () => {
    expect(activitesRequisesModule(64, { status: "completed", completed_at: "2026-10-27T17:00:00Z" } as any).some((a) => a.id === ID_QUIZ_SANCTIONS)).toBe(false);
  });
  it("module en cours : exigée", () => {
    expect(activitesRequisesModule(64, { status: "in_progress", completed_at: null } as any).some((a) => a.id === ID_QUIZ_SANCTIONS)).toBe(true);
  });
});
