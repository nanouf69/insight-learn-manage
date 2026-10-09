import { describe, expect, it } from "vitest";
import { getHistoryDefaults, historyStartTimestamp } from "@/lib/reports/history-defaults";

describe("Historique : préférence d'affichage non destructive", () => {
  const target = "c048754d-9045-4ab6-b89f-a5ab26de314c";

  it("ouvre le dossier ciblé depuis le 5 octobre inclus sans date de fin", () => {
    expect(getHistoryDefaults(target)).toEqual({ period: "custom", start: "2026-10-05", end: "" });
  });

  it.each([undefined, "", "eleve-fictif-vtc", "eleve-fictif-taxi", "eleve-fictif-va", "eleve-fictif-ta", "MAJSAK"])(
    "ne change pas les autres dossiers (%s)", (id) => {
      expect(getHistoryDefaults(id)).toEqual({ period: "all", start: "", end: "" });
    },
  );

  it("respecte minuit local et inclut la première seconde du 5 octobre", () => {
    const since = historyStartTimestamp("2026-10-05");
    const localMidnight = new Date(2026, 9, 5, 0, 0, 0);
    expect(since).toBe(localMidnight.toISOString());
    const rows = [
      { id: "avant", started_at: new Date(localMidnight.getTime() - 1).toISOString() },
      { id: "limite", started_at: since },
      { id: "apres", started_at: new Date(localMidnight.getTime() + 1).toISOString() },
    ];
    const before = JSON.stringify(rows);
    expect(rows.filter(row => row.started_at >= since).map(row => row.id)).toEqual(["limite", "apres"]);
    expect(JSON.stringify(rows)).toBe(before);
    expect(rows).toHaveLength(3); // Tout l'historique reste accessible.
  });
});