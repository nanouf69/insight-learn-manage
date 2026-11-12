import { describe, expect, it } from "vitest";
import { revisionBanniereConfirmee } from "@/lib/revisionBannierePreuve";
import { bilanRevisionAchevementConfirme } from "@/lib/bilanRevisionPersistence";
const sources = { "gestion:1": "copy1", "t3p:2": "copy2" };
const answers = { "gestion:1": "Réponse QRC", "t3p:2": ["A", "C"] };
const order = Object.keys(sources);
const draft = { apprenant_id: "owner", exercice_id: "revision_fausses_EB4__r2", exercice_type: "revision_fausses", completed: true, score: 1,
  reponses: { revisionState: { examenId: "EB4", questionOrder: order, correctedQuestions: order, answers, sourceResultIds: sources } } };
const result = { id: "receipt", apprenant_id: "owner", quiz_id: "EB4", quiz_type: "revision_fausses", score_obtenu: 1, score_max: 2,
  details: { revision_exercice_id: draft.exercice_id, questionOrder: order, reponses: answers } };
describe("preuve durable bannière", () => {
  it("reçu sans sources utilise seulement sa reprise serveur liée ; note imparfaite terminée", () => {
    expect(revisionBanniereConfirmee(result, draft, "owner", "EB4", sources)).toBe(true);
  });
  it("clôture seule sans reçu, autre copie, autre compte ou conflit ne terminent rien", () => {
    expect(revisionBanniereConfirmee({}, draft, "owner", "EB4", sources)).toBe(false);
    expect(revisionBanniereConfirmee(result, draft, "other", "EB4", sources)).toBe(false);
    expect(revisionBanniereConfirmee(result, draft, "owner", "EB4", { ...sources, "gestion:1": "other" })).toBe(false);
    expect(revisionBanniereConfirmee({ ...result, details: { ...result.details, sourceResultIds: {} } }, draft, "owner", "EB4", sources)).toBe(false);
  });
  it("QRC vide ou QCM manquant interdit la bannière même si completed=true", () => {
    const incomplete = { ...draft, reponses: { revisionState: { ...draft.reponses.revisionState, answers: { ...answers, "gestion:1": "" } } } };
    expect(revisionBanniereConfirmee(result, incomplete, "owner", "EB4", sources)).toBe(false);
    expect(revisionBanniereConfirmee(result, { ...draft, completed: false }, "owner", "EB4", sources)).toBe(false);
  });
  it("Bilan futur : submitted sans toutes réponses ou sans date ne prouve pas la fin", () => {
    const source = { owner: "owner", module: 5, exercise: 502, receipt: "receipt", version: "v1", questions: ["1", "2"] };
    const row = { status: "submitted", submitted_at: "2026-11-12T17:03:00Z", reponses: { __source: source, "1": ["A", "C"], "2": "QRC" } };
    expect(bilanRevisionAchevementConfirme(row, source)).toBe(true);
    expect(bilanRevisionAchevementConfirme({ ...row, reponses: { ...row.reponses, "2": "" } }, source)).toBe(false);
    expect(bilanRevisionAchevementConfirme({ ...row, submitted_at: null }, source)).toBe(false);
  });
});