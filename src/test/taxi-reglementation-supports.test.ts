// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { projeterSupportTaxi, SUPPORTS_TAXI_REGLEMENTATION } from "@/lib/taxiReglementationSupports";

const cours = (id: number) => ({ id, titre: `T${id}`, slidesKey: "nationale-partie1", quiz: [{ q: 1 }], fichiers: [{ nom: "PDF", url: "/cours/vtc/F_Locale_1.pdf" }] });

const taille = (fichier: string) => JSON.parse(readFileSync(`src/assets/cours-taxi/${fichier}`, "utf8")).size as number;

describe("Supports Réglementation TAXI (module 10)", () => {
  it("chaque partie reçoit son fichier", () => {
    const attendu: Record<number, string> = {
      10014: "F_Nationale_1_TAXI_20261126",
      10015: "F_Nationale_2_TAXI_20261126",
      10016: "F_Locale_1_TAXI_20261124",
      10017: "F_Locale_2_TAXI_20261126",
      10018: "F_Locale_3_TAXI_20261124",
    };
    for (const [id, nom] of Object.entries(attendu)) {
      const p = projeterSupportTaxi(10, cours(Number(id)));
      expect(p.fichiers.map((f) => f.url).every((u) => u.includes(nom))).toBe(true);
      expect(p.fichiers.map((f) => f.url.split(".").pop())).toEqual(["pdf", "pptx"]);
    }
  });
  it("nombre de diapositives attendu", () => {
    expect(Object.values(SUPPORTS_TAXI_REGLEMENTATION).map((s) => s.diapositives)).toEqual([33, 21, 17, 17, 17]);
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
  });
  it("les supports Locale 1 et 3 du 24/11/2026 restent inchangés", () => {
    expect(taille("F_Locale_1_TAXI_20261124.pptx.asset.json")).toBe(1650480);
    expect(taille("F_Locale_3_TAXI_20261124.pptx.asset.json")).toBe(85004);
    expect(taille("F_Locale_1_TAXI_20261124.pdf.asset.json")).toBe(719890);
    expect(taille("F_Locale_3_TAXI_20261124.pdf.asset.json")).toBe(453330);
  });
  it("les trois supports du 26/11/2026 sont exactement les fichiers fournis et leurs PDF", () => {
    expect(taille("F_Nationale_1_TAXI_20261126.pptx.asset.json")).toBe(3100752);
    expect(taille("F_Nationale_1_TAXI_20261126.pdf.asset.json")).toBe(1720182);
    expect(taille("F_Nationale_2_TAXI_20261126.pptx.asset.json")).toBe(1296402);
    expect(taille("F_Nationale_2_TAXI_20261126.pdf.asset.json")).toBe(1446908);
    expect(taille("F_Locale_2_TAXI_20261126.pptx.asset.json")).toBe(151966);
    expect(taille("F_Locale_2_TAXI_20261126.pdf.asset.json")).toBe(578588);
  });
  it("tous les supports remplacés restent conservés (historique non écrasé)", () => {
    for (const f of [
      "F_Locale_1_TAXI_20261027.pptx.asset.json", "F_Locale_1_TAXI_20261027.pdf.asset.json",
      "F_Locale_2_TAXI_20261027b.pptx.asset.json", "F_Locale_2_TAXI_20261027b.pdf.asset.json",
      "F_Locale_3_TAXI_20261027.pptx.asset.json", "F_Locale_3_TAXI_20261027.pdf.asset.json",
      "F_Nationale_1_TAXI_20261027.pptx.asset.json", "F_Nationale_1_TAXI_20261027.pdf.asset.json",
      "F_Nationale_2_TAXI_20261027.pptx.asset.json", "F_Nationale_2_TAXI_20261027.pdf.asset.json",
      "F_Locale_2_TAXI_20261124.pptx.asset.json", "F_Locale_2_TAXI_20261124.pdf.asset.json",
    ]) expect(existsSync(`src/assets/cours-taxi/${f}`), f).toBe(true);
    expect(SUPPORTS_TAXI_REGLEMENTATION[10014].pptx).not.toContain("20261027");
    expect(SUPPORTS_TAXI_REGLEMENTATION[10015].pptx).not.toContain("20261027");
    expect(SUPPORTS_TAXI_REGLEMENTATION[10016].pptx).not.toContain("20261027");
    expect(SUPPORTS_TAXI_REGLEMENTATION[10017].pptx).not.toContain("20261124");
  });
});
