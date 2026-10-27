// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { projeterSupportTaxi, SUPPORTS_TAXI_REGLEMENTATION } from "@/lib/taxiReglementationSupports";

const cours = (id: number) => ({ id, titre: `T${id}`, slidesKey: "nationale-partie1", quiz: [{ q: 1 }], fichiers: [{ nom: "PDF", url: "/cours/vtc/F_Locale_1.pdf" }] });

describe("Supports Réglementation TAXI (module 10)", () => {
  it("chaque partie reçoit son fichier", () => {
    const attendu: Record<number, string> = { 10014: "F_Nationale_1_TAXI", 10015: "F_Nationale_2_TAXI", 10016: "F_Locale_1_TAXI", 10017: "F_Locale_2_TAXI", 10018: "F_Locale_3_TAXI" };
    for (const [id, nom] of Object.entries(attendu)) {
      const p = projeterSupportTaxi(10, cours(Number(id)));
      expect(p.fichiers.map((f) => f.url).every((u) => u.includes(nom))).toBe(true);
      expect(p.fichiers.map((f) => f.url.split(".").pop())).toEqual(["pdf", "pptx"]);
    }
  });
  it("nombre de diapositives attendu", () => {
    expect(Object.values(SUPPORTS_TAXI_REGLEMENTATION).map((s) => s.diapositives)).toEqual([33, 21, 17, 15, 17]);
  });
  it("identité, titre et quiz conservés", () => {
    const c = cours(10016); const p = projeterSupportTaxi(10, c);
    expect(p.id).toBe(10016); expect(p.titre).toBe(c.titre); expect(p.quiz).toBe(c.quiz);
    expect(c.fichiers[0].url).toBe("/cours/vtc/F_Locale_1.pdf"); // objet source non modifié
  });
  it("aucun autre module ni autre cours touché (TA, VTC, module 24)", () => {
    for (const m of [2, 24, 39, 40, 42]) expect(projeterSupportTaxi(m, cours(10016))).toEqual(cours(10016));
    expect(projeterSupportTaxi(10, cours(10013))).toEqual(cours(10013));
  });
  it("les pointeurs désignent des fichiers versionnés distincts", () => {
    const urls = Object.values(SUPPORTS_TAXI_REGLEMENTATION).flatMap((s) => [s.pdf, s.pptx]);
    expect(new Set(urls).size).toBe(10);
    expect(JSON.parse(readFileSync("src/assets/cours-taxi/F_Locale_1_TAXI_20261027.pptx.asset.json", "utf8")).size).toBe(1650480);
  });
});
