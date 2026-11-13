import { describe, it, expect } from "vitest";
import { getAnswerSaveIndicatorView } from "@/components/cours-en-ligne/answerSaveIndicatorModel";

const base = { state: "saved" as const, pendingAnswers: 0, saturated: false, rejection: null };

describe("Indicateur de sauvegarde et file du noyau V2 (13/11)", () => {
  it("jamais « Sauvegardé » tant qu'une réponse d'examen attend la confirmation serveur", () => {
    const v = getAnswerSaveIndicatorView({ ...base, noyau: { enAttente: 2, stockage: "durable" } });
    expect(v.tone).toBe("pending");
    expect(v.message).toContain("2 réponses pas encore confirmées");
  });

  it("stockage refusé avec réponses en attente : alerte prioritaire « ne fermez pas la page »", () => {
    const v = getAnswerSaveIndicatorView({ ...base, noyau: { enAttente: 1, stockage: "memoire" } });
    expect(v.tone).toBe("saturated");
    expect(v.message).toContain("Ne fermez pas et ne rechargez pas la page");
  });

  it("repli onglet : l'élève est prévenu que seules cet onglet conserve ses réponses", () => {
    const v = getAnswerSaveIndicatorView({ ...base, noyau: { enAttente: 1, stockage: "session" } });
    expect(v.tone).toBe("pending");
    expect(v.message).toContain("cet onglet uniquement");
  });

  it("tout confirmé : « Sauvegardé » seulement si les deux files sont vides", () => {
    expect(getAnswerSaveIndicatorView({ ...base, noyau: { enAttente: 0, stockage: "memoire" } }).tone).toBe("saved");
    expect(getAnswerSaveIndicatorView({ ...base, noyau: null }).tone).toBe("saved");
  });

  it("serveur indisponible : le message d'indisponibilité reste prioritaire sur la simple attente", () => {
    const v = getAnswerSaveIndicatorView({ ...base, state: "error", noyau: { enAttente: 3, stockage: "durable" } });
    expect(v.tone).toBe("unavailable");
  });
});
