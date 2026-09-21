import { describe, it, expect } from "vitest";
import { computeExamRetakeLock, formatRetakeAvailability, examRetakeLockMessage, EXAM_RETAKE_DELAY_MS } from "@/lib/examRetakeDelay";

const FIN = new Date("2026-09-21T13:30:00.000Z").getTime(); // 21/09/2026 15h30 Paris

describe("Examen blanc — délai de 48 h avant une nouvelle tentative", () => {
  it("47 h 59 après la fin = BLOQUÉ", () => {
    const lock = computeExamRetakeLock(FIN, FIN + 47 * 3600_000 + 59 * 60_000);
    expect(lock.locked).toBe(true);
    expect(formatRetakeAvailability(lock.availableAt)).toBe("23/09/2026 à 15h30");
  });

  it("48 h pile après la fin = AUTORISÉ", () => {
    expect(computeExamRetakeLock(FIN, FIN + EXAM_RETAKE_DELAY_MS).locked).toBe(false);
  });

  it("aucune tentative terminée = AUTORISÉ", () => {
    expect(computeExamRetakeLock(null, FIN).locked).toBe(false);
  });

  it("message affiché à l'apprenant", () => {
    const lock = computeExamRetakeLock(FIN, FIN + 3600_000);
    expect(examRetakeLockMessage(lock.availableAt)).toBe(
      "🔒 Refaire l'examen indisponible — vous pourrez refaire cet examen le 23/09/2026 à 15h30.",
    );
  });
});
