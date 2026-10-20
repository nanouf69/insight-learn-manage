// @vitest-environment node
import { describe, it, expect } from "vitest";
import { THEMES } from "@/components/sessions/GrilleNotationConduite";

const ids = (formation: "vtc" | "taxi") =>
  THEMES.flatMap((t) => t.criteres.filter((c) => !c.only || c.only === formation).map((c) => c.id));

describe("grille de notation conduite — critères demandés", () => {
  it("« Consolider les connaissances » existe pour VTC", () => {
    expect(ids("vtc")).toContain("consolider_connaissances");
  });
  it("« Consolider les connaissances » existe pour TAXI", () => {
    expect(ids("taxi")).toContain("consolider_connaissances");
  });
  it("« Ne sait pas remplir un devis » existe pour VTC et TAXI", () => {
    expect(ids("vtc")).toContain("devis_remplir");
    expect(ids("taxi")).toContain("devis_remplir");
  });
  it("les critères historiques restent présents (aucune régression)", () => {
    const tout = ids("vtc");
    expect(tout).toContain("devis");
    expect(tout).toContain("tva");
    expect(tout).toContain("gps");
    const taxi = ids("taxi");
    expect(taxi).toContain("taximetre");
    expect(taxi).toContain("attente");
  });
});
