import { describe, expect, it } from "vitest";
import { classifyAnswerSaveFailure, computeRetryDelay } from "@/lib/answerPersistence";

/**
 * ÉTAPE 1 DU PLAN ANTI-PANNE — politique de réessai.
 * Aucune donnée réelle : uniquement la classification des réponses serveur.
 */
describe("Classification des échecs de sauvegarde", () => {
  it("règle des 48 h (P0471) → refus DÉFINITIF, message explicite, aucun réessai", () => {
    const v = classifyAnswerSaveFailure(
      500,
      '{"code":"P0471","message":"Nouveau passage interdit avant 48 h (dernier passage le 22/09 10:09)"}',
    );
    expect(v.definitif).toBe(true);
    expect(v.reason).toBe("retake_delay");
    expect(v.message).toContain("48 h");
  });

  it("absence de droits → DÉFINITIF", () => {
    expect(classifyAnswerSaveFailure(403, "auth_user_id_mismatch").definitif).toBe(true);
    expect(classifyAnswerSaveFailure(403, "auth_user_id_mismatch").reason).toBe("forbidden");
    expect(classifyAnswerSaveFailure(500, "permission denied for function check_apprenant_session").definitif).toBe(true);
  });

  it("passage déjà terminé / examen fermé / tentative non autorisée → DÉFINITIF", () => {
    expect(classifyAnswerSaveFailure(500, "attempt is closed").definitif).toBe(true);
    expect(classifyAnswerSaveFailure(500, "Cette tentative est déjà terminée").definitif).toBe(true);
    expect(classifyAnswerSaveFailure(409, "tentative non autorisée").definitif).toBe(true);
  });

  it("panne serveur / base indisponible / timeout → TEMPORAIRE, la file réessaie", () => {
    expect(classifyAnswerSaveFailure(500, "internal server error").definitif).toBe(false);
    expect(classifyAnswerSaveFailure(502, "Bad Gateway").definitif).toBe(false);
    expect(classifyAnswerSaveFailure(503, "service unavailable").definitif).toBe(false);
    expect(classifyAnswerSaveFailure(522, "Connection timed out").definitif).toBe(false);
    expect(classifyAnswerSaveFailure(408, "request timeout").definitif).toBe(false);
    expect(classifyAnswerSaveFailure(429, "too many requests").definitif).toBe(false);
  });
});

describe("Backoff avec jitter", () => {
  it("croît avec les tentatives et reste plafonné", () => {
    expect(computeRetryDelay(1, () => 0.5)).toBe(2000);
    expect(computeRetryDelay(2, () => 0.5)).toBe(4000);
    expect(computeRetryDelay(10, () => 0.5)).toBe(30000);
    expect(computeRetryDelay(50, () => 1)).toBeLessThanOrEqual(39000);
  });

  it("étale les renvois : deux appareils ne repartent pas à la même milliseconde", () => {
    const a = computeRetryDelay(5, () => 0);
    const b = computeRetryDelay(5, () => 1);
    expect(a).not.toBe(b);
    expect(a).toBeGreaterThan(0);
  });

  it("100 réessais d'un refus définitif ne partent jamais (aucune boucle type SAWADOGO)", () => {
    let envois = 0;
    // Simulation du worker : un refus définitif marque l'élément « blocked »,
    // qui n'est plus jamais renvoyé, mais reste conservé en file.
    let blocked = false;
    for (let i = 0; i < 100; i++) {
      if (blocked) continue;
      envois += 1;
      const v = classifyAnswerSaveFailure(500, "P0471 nouveau passage interdit avant 48 h");
      if (v.definitif) blocked = true;
    }
    expect(envois).toBe(1);
  });
});
