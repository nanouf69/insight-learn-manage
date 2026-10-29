import { describe, expect, it } from "vitest";
import { isStatementTimeout, nextFailedSave, retryPayload } from "@/lib/adminSaveFailure";

const p = (local_revision: number) => ({ local_revision, label: `r${local_revision}` });

describe("Enregistrement Admin refusé (57014)", () => {
  it("un refus garde la modification comme NON enregistrée", () => {
    const attempt = p(3);
    expect(nextFailedSave(null, attempt, false)).toBe(attempt);
  });

  it("un succès de la même révision ou plus récente efface l'échec", () => {
    const failed = p(3);
    expect(nextFailedSave(failed, failed, true)).toBeNull();
    expect(nextFailedSave(failed, p(4), true)).toBeNull();
  });

  it("un succès plus ancien n'efface jamais l'échec d'une modification plus récente", () => {
    const failed = p(5);
    expect(nextFailedSave(failed, p(4), true)).toBe(failed);
  });

  it("Réessayer renvoie la version la plus récente affichée, jamais une plus ancienne", () => {
    const failed = p(5);
    expect(retryPayload(failed, null)).toBe(failed);
    const newer = p(6);
    expect(retryPayload(failed, newer)).toBe(newer);
    expect(retryPayload(failed, p(2))).toBe(failed);
    expect(retryPayload(null, newer)).toBeNull();
  });

  it("reconnaît le délai dépassé du serveur", () => {
    expect(isStatementTimeout({ code: "57014", message: "x" })).toBe(true);
    expect(isStatementTimeout({ message: "canceling statement due to statement timeout" })).toBe(true);
    expect(isStatementTimeout({ code: "P0409", message: "stale" })).toBe(false);
  });
});
