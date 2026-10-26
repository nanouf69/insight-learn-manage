import { describe, it, expect } from "vitest";
import { selectLatestAttemptRows } from "@/components/cours-en-ligne/examens-blancs-utils";
const r = (m: string, t: number, d: string) => ({ id: m + t + d, matiere_id: m, matiere_nom: m, tentative: t, completed_at: d, created_at: d, note_sur_20: 12 });
describe("sélection des matières d'un EB par tentative", () => {
  it("garde les 7 matières d'un même passage étalé sur 13 jours (EB3)", () => {
    const rows = ["A","B","C","D","E"].map(m => r(m, 1, "2026-09-29T11:00:00Z")).concat(["F","G"].map(m => r(m, 1, "2026-10-12T05:00:00Z")));
    expect(selectLatestAttemptRows(rows)).toHaveLength(7);
  });
  it("ne complète jamais une matière jamais remise (EB2 F/G absentes)", () => {
    const rows = ["A","B","C","D","E"].map(m => r(m, 2, "2026-10-12T05:00:00Z"));
    expect(selectLatestAttemptRows(rows)).toHaveLength(5);
  });
  it("une nouvelle tentative prime sur l'ancienne pour la même matière", () => {
    const sel = selectLatestAttemptRows([r("A", 1, "2026-09-01T00:00:00Z"), r("A", 2, "2026-09-02T00:00:00Z")]);
    expect(sel).toHaveLength(1); expect(sel[0].tentative).toBe(2);
  });
});
