import { describe, expect, it } from "vitest";
import { elearningHoursEvidence } from "@/lib/elearningHoursEvidence";

const base = { apprenantId: "fictif", apprenant: {}, acts: [], quizzes: [], exos: [], cnxAll: [], pratiqueDates: [] };
const act = (occurred_at: string, module_nom = "Cours", action_type = "open_cours") => ({ occurred_at, module_nom, action_type });

describe("Dates d'activité réelle e-learning", () => {
  it("connexion seule même avec un module mémorisé : aucune date", () => {
    const r = elearningHoursEvidence({ ...base, cnxAll: [{ started_at: "2026-10-01T08:00:00Z", ended_at: "2026-10-23T09:00:00Z", current_module: "Pratique" }] });
    expect(r.premiereActiviteAt).toBeNull(); expect(r.derniereActiviteAt).toBeNull(); expect(r.onlineMin).toBe(0);
  });
  it("cours/exercice/quiz triés, pas la connexion antérieure ni postérieure", () => {
    const r = elearningHoursEvidence({ ...base, acts: [act("2026-10-05T09:30:00Z")],
      exos: [{ updated_at: "2026-10-06T10:00:00Z" }], quizzes: [{ completed_at: "2026-10-07T11:00:00Z" }],
      cnxAll: [{ started_at: "2026-10-05T09:00:00Z", ended_at: "2026-10-05T10:00:00Z" }, { started_at: "2026-10-23T09:00:00Z", ended_at: "2026-10-23T10:00:00Z" }] });
    expect(r.premiereActiviteAt).toBe("2026-10-05T09:30:00.000Z"); expect(r.derniereActiviteAt).toBe("2026-10-07T11:00:00.000Z"); expect(r.onlineMin).toBe(60);
  });
  it("accueil, système, action non pédagogique et date invalide exclus", () => {
    const r = elearningHoursEvidence({ ...base, acts: [act("2026-10-01T09:00:00Z", "Accueil"), act("2026-10-01T09:00:00Z", "Liste des modules"), act("2026-10-01T09:00:00Z", "Système"), act("2026-10-01T09:00:00Z", "Cours", "login"), act("invalide")] });
    expect(r.premiereActiviteAt).toBeNull(); expect(r.derniereActiviteAt).toBeNull();
  });
  it("aucune première ou dernière date après la fin d'accès", () => {
    const r = elearningHoursEvidence({ ...base, apprenant: { date_fin_cours_en_ligne: "2026-10-05" }, acts: [act("2026-10-06T09:00:00Z")] });
    expect(r.premiereActiviteAt).toBeNull(); expect(r.derniereActiviteAt).toBeNull();
  });
  it("respecte le début du calcul existant et la fin de jour Paris", () => {
    const r = elearningHoursEvidence({ ...base, apprenantId: "c048754d-9045-4ab6-b89f-a5ab26de314c", apprenant: { date_fin_cours_en_ligne: "2026-10-06" },
      acts: [act("2026-10-05T21:59:00Z"), act("2026-10-05T22:05:00Z"), act("2026-10-06T21:59:00Z"), act("2026-10-06T22:01:00Z")] });
    expect(r.premiereActiviteAt).toBe("2026-10-05T22:05:00.000Z"); expect(r.derniereActiviteAt).toBe("2026-10-06T21:59:00.000Z");
  });
});