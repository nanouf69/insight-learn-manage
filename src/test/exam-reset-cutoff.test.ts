// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isAfterExamReset, latestExamResetCutoffs } from "@/lib/examResetCutoff";

describe("remise à zéro administrative d'un examen", () => {
  it("retient uniquement la dernière coupure par examen", () => {
    expect(latestExamResetCutoffs([
      { exam_id: "EB1", cutoff_at: "2026-09-23T10:00:00Z" },
      { exam_id: "EB1", cutoff_at: "2026-09-23T12:00:00Z" },
      { exam_id: "EB2", cutoff_at: "2026-09-22T12:00:00Z" },
    ])).toEqual({
      EB1: new Date("2026-09-23T12:00:00Z").getTime(),
      EB2: new Date("2026-09-22T12:00:00Z").getTime(),
    });
  });

  it("écarte la progression historique et accepte uniquement le nouveau passage", () => {
    const cutoff = new Date("2026-09-23T14:00:00Z").getTime();
    expect(isAfterExamReset("2026-09-23T13:59:59Z", cutoff)).toBe(false);
    expect(isAfterExamReset("2026-09-23T14:00:01Z", cutoff)).toBe(true);
  });

  it("écarte une ligne sans date plutôt que de reprendre un ancien état", () => {
    expect(isAfterExamReset(undefined, Date.now())).toBe(false);
  });
});