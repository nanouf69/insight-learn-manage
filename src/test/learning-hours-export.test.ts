import { describe, it, expect } from "vitest";
import { buildRapportActiviteHtml } from "@/lib/reports/rapport-activite-html";

describe("Scoped hours in exported history", () => {
  const id = "c048754d-9045-4ab6-b89f-a5ab26de314c";
  const connexions = [
    { id: "before", started_at: "2026-10-05T09:00:00Z", ended_at: "2026-10-05T10:00:00Z", last_seen_at: "2026-10-05T10:00:00Z", current_module: "Cours" },
    { id: "cross", started_at: "2026-10-05T21:30:00Z", ended_at: "2026-10-05T22:30:00Z", last_seen_at: "2026-10-05T22:30:00Z", current_module: "Cours" },
    { id: "after", started_at: "2026-10-06T09:00:00Z", ended_at: "2026-10-06T10:00:00Z", last_seen_at: "2026-10-06T10:00:00Z", current_module: "Cours" },
  ];
  it("retains all history but counts only proven time after midnight Paris", () => {
    const html = buildRapportActiviteHtml({ apprenant: { id, nom: "Fictif", prenom: "Test" }, connexions, activites: [], quizResults: [], completedModuleIds: new Set(), exerciseActivityTimestamps: ["2026-10-05T22:10:00Z", "2026-10-06T09:30:00Z"] });
    expect(html).toContain('class="stat-value">1h30');
    expect(html).toContain('class="stat-value">3');
    expect(html).toContain("0h00");
  });
  it("does not qualify a crossing session solely by activity before midnight", () => {
    const html = buildRapportActiviteHtml({ apprenant: { id, nom: "Fictif", prenom: "Test" }, connexions, activites: [], quizResults: [], completedModuleIds: new Set(), exerciseActivityTimestamps: ["2026-10-05T21:40:00Z"] });
    expect(html).toContain('class="stat-value">0h00');
  });
  it("leaves unrelated learner totals unchanged", () => {
    const html = buildRapportActiviteHtml({ apprenant: { id: "other", nom: "Fictif", prenom: "Test" }, connexions, activites: [], quizResults: [], completedModuleIds: new Set() });
    expect(html).toContain('class="stat-value">3h00');
  });
});