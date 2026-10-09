import { describe, expect, it } from "vitest";
import { getLearningHoursStartMs, learningSessionMinutes, learningSessionWindow } from "@/lib/reports/learning-hours-window";
import { getSessionDurationMinutes } from "@/lib/reports/session-duration";
import { getHistoryDefaults } from "@/lib/reports/history-defaults";

const id = "c048754d-9045-4ab6-b89f-a5ab26de314c";
describe("Learning calculation window without evidence mutations", () => {
  it("uses Paris midnight independently of browser timezone and history", () => {
    expect(getLearningHoursStartMs(id)).toBe(Date.parse("2026-10-05T22:00:00Z"));
    expect(getHistoryDefaults(id).start).toBe("2026-10-05");
    expect(getLearningHoursStartMs("other")).toBeNull();
    expect(getLearningHoursStartMs()).toBeNull();
  });
  it.each([
    ["2026-10-05T09:00:00Z", "2026-10-05T10:00:00Z", 0],
    ["2026-10-05T21:00:00Z", "2026-10-05T22:00:00Z", 0],
    ["2026-10-05T21:30:00Z", "2026-10-05T22:30:00Z", 30],
    ["2026-10-05T22:00:00Z", "2026-10-05T23:00:00Z", 60],
    ["2026-10-06T09:00:00Z", "2026-10-06T10:00:00Z", 60],
    ["invalid", "2026-10-06T10:00:00Z", 0],
  ])("counts only the part after the boundary (%s)", (started_at, ended_at, minutes) => {
    const row = Object.freeze({ started_at, ended_at });
    expect(learningSessionMinutes(row, id)).toBe(minutes);
    expect(row.started_at).toBe(started_at);
  });
  it("does not reset the original seven-hour cap", () => {
    expect(learningSessionMinutes({ started_at: "2026-10-05T20:00:00Z", ended_at: "2026-10-06T10:00:00Z" }, id)).toBe(300);
  });
  it("keeps the access-end cutoff", () => {
    expect(learningSessionMinutes({ started_at: "2026-10-05T21:00:00Z", ended_at: "2026-10-05T23:00:00Z" }, id, Date.parse("2026-10-05T22:15:00Z"))).toBe(15);
  });
  it("does not accept activity before the calculation window", () => {
    const window = learningSessionWindow({ started_at: "2026-10-05T21:30:00Z", ended_at: "2026-10-05T22:30:00Z" }, id);
    expect(Date.parse("2026-10-05T21:45:00Z") >= window.start).toBe(false);
  });
  it.each(["vtc-e", "taxi-e", "ta-e", "va-e", "continue-vtc", "continue-taxi"])("leaves other learners unchanged (%s)", (other) => {
    const row = { started_at: "2026-10-05T20:00:00Z", ended_at: "2026-10-06T10:00:00Z" };
    expect(learningSessionMinutes(row, other)).toBe(getSessionDurationMinutes(row));
  });
});