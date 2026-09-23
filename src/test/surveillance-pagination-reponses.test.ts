// @vitest-environment node
import { describe, it, expect } from "vitest";
import { lireParLotsEtPages, lireToutesLesPages } from "@/features/surveillance-examens/lectureComplete";

// Simule la base : jamais plus de 1 000 lignes par demande.
const base = (n: number, nbTentatives: number) =>
  Array.from({ length: n }, (_, i) => ({ attempt_id: `t${i % nbTentatives}`, question_id: `q${i}` }));

const lirePlafonne = <T,>(rows: T[]) => async (d: number, f: number) => ({
  data: rows.slice(d, Math.min(f + 1, d + 1000)),
  error: null,
});

describe("surveillance : lecture complète des réponses (> 1 000 lignes)", () => {
  for (const n of [1000, 1279, 5000, 10000]) {
    it(`lit 100 % de ${n} réponses`, async () => {
      const rows = base(n, 300);
      const lu = await lireToutesLesPages(lirePlafonne(rows));
      expect(lu.length).toBe(n);
    });

    it(`lit 100 % de ${n} réponses réparties par lots d'identifiants`, async () => {
      const rows = base(n, 300);
      const ids = Array.from({ length: 300 }, (_, i) => `t${i}`);
      const lu = await lireParLotsEtPages(ids, async (lot, d, f) => {
        const filtre = rows.filter((r) => lot.includes(r.attempt_id));
        return { data: filtre.slice(d, Math.min(f + 1, d + 1000)), error: null };
      });
      expect(lu.length).toBe(n);
      // la dernière tentative (la plus récente) n'est jamais coupée
      expect(lu.filter((r) => r.attempt_id === "t299").length).toBeGreaterThan(0);
    });
  }

  it("propage une erreur au lieu de compter 0 réponse", async () => {
    await expect(lireToutesLesPages(async () => ({ data: null, error: new Error("x") }))).rejects.toThrow();
  });
});
