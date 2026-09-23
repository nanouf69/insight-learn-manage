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

import { diagnostiquer } from "@/features/surveillance-examens/classification";

describe("surveillance : diagnostic indépendant du volume", () => {
  const base = { nbResultats: 1, neutralisee: false, ouverteDepuisMs: 60_000 };
  it("terminé avec 0 réponse = vrai 0 technique", () => {
    expect(diagnostiquer({ ...base, etat: "terminee", questionsAttendues: 15, reponsesServeur: 0 })).toEqual([
      "RESULTAT_SANS_REPONSE_SERVEUR",
    ]);
  });
  it("terminé avec toutes ses réponses = aucune alerte", () => {
    expect(diagnostiquer({ ...base, etat: "terminee", questionsAttendues: 15, reponsesServeur: 15 })).toEqual([]);
  });
  it("en cours avec réponses partielles = aucune alerte", () => {
    expect(diagnostiquer({ ...base, nbResultats: 0, etat: "en_cours", questionsAttendues: 18, reponsesServeur: 12 })).toEqual([]);
  });
  it("ancien incident neutralisé reste identifiable", () => {
    expect(
      diagnostiquer({ ...base, neutralisee: true, etat: "terminee", questionsAttendues: 20, reponsesServeur: 0 }),
    ).toEqual(["NEUTRALISEE"]);
  });
  for (const volume of [999, 1001, 5000, 10000]) {
    it(`même diagnostic pour Thierno 15/15 avec ${volume} réponses dans la période`, async () => {
      const rows = Array.from({ length: volume }, (_, i) => ({ attempt_id: i < 15 ? "thierno" : `t${i % 200}`, q: `q${i}` }));
      rows.reverse(); // Thierno en dernier = cas qui était coupé
      const lu = await lireToutesLesPages(async (d, f) => ({ data: rows.slice(d, Math.min(f + 1, d + 1000)), error: null }));
      const n = lu.filter((r) => r.attempt_id === "thierno").length;
      expect(n).toBe(15);
      expect(diagnostiquer({ ...base, etat: "terminee", questionsAttendues: 15, reponsesServeur: n })).toEqual([]);
    });
  }
});
