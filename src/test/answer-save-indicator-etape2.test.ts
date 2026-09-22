// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getAnswerSaveIndicatorView } from "@/components/cours-en-ligne/answerSaveIndicatorModel";
import type { AnswerSaveRejection, AnswerSaveState } from "@/lib/answerPersistence";

const view = (
  state: AnswerSaveState,
  pendingAnswers: number,
  rejection: AnswerSaveRejection | null = null,
  saturated = false,
) => getAnswerSaveIndicatorView({ state, pendingAnswers, rejection, saturated });

describe("Étape 2 — indicateur informatif de sauvegarde", () => {
  it("réponse → orange, puis ACK serveur et file vide → vert", () => {
    expect(view("saving", 1)).toMatchObject({ tone: "pending" });
    expect(view("saved", 0)).toEqual({
      tone: "saved",
      message: "Sauvegardé — toutes vos réponses sont enregistrées",
    });
  });

  it("affiche le nombre exact de réponses en attente", () => {
    expect(view("saving", 3).message).toContain("3 réponses en attente");
    expect(view("saving", 1).message).toContain("1 réponse en attente");
  });

  it("une panne temporaire est rouge et confirme la conservation locale", () => {
    const result = view("error", 4);
    expect(result.tone).toBe("unavailable");
    expect(result.message).toContain("Serveur temporairement indisponible");
    expect(result.message).toContain("conservées sur cet appareil");
  });

  it("les réponses hors ligne augmentent le compteur puis repassent orange et vert", () => {
    expect(view("error", 2).tone).toBe("unavailable");
    expect(view("error", 5).tone).toBe("unavailable");
    expect(view("saving", 5)).toMatchObject({ tone: "pending" });
    expect(view("saved", 0)).toMatchObject({ tone: "saved" });
  });

  it("un refus 48 h affiche la raison fonctionnelle, jamais une panne serveur", () => {
    const result = view("saved", 0, {
      exerciceId: "eb3-test",
      reason: "retake_delay",
      at: "2026-09-22T20:00:00.000Z",
      message: "Nouveau passage non autorisé avant 48 h.",
    });
    expect(result.tone).toBe("rejected");
    expect(result.message).toContain("48 h");
    expect(result.message).not.toContain("Serveur temporairement indisponible");
  });

  it("après F5, une file relue reste en attente et ne devient jamais verte", () => {
    expect(view("idle", 2)).toMatchObject({ tone: "pending" });
    expect(view("saved", 2)).toMatchObject({ tone: "pending" });
  });

  it("ne montre rien avant toute écriture confirmée", () => {
    expect(view("idle", 0)).toEqual({ tone: "hidden", message: "" });
  });
});