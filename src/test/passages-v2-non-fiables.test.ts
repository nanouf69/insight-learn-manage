// @vitest-environment node
import { describe, it, expect } from "vitest";
import { estPassageNonFiable, estPassageConcerne, normaliserValeurReponse } from "@/lib/passagesV2NonFiables";

describe("Passages nouveau moteur non fiables (défaut du 23/09)", () => {
  it("texte QRC tronqué dans le moteur = non fiable", () => {
    expect(estPassageNonFiable("gestion", { 1: "24000÷5 = 4800 ; 4800×3 = 14400" }, { "gestion:1": "24000" })).toBe(true);
  });
  it("réponse absente du moteur = non fiable", () => {
    expect(estPassageNonFiable("securite", { 3: ["B"] }, {})).toBe(true);
  });
  it("mêmes réponses (ordre QCM indifférent) = fiable", () => {
    expect(estPassageNonFiable("t3p", { 1: ["B", "A"], 2: " texte " }, { "t3p:1": ["A", "B"], "t3p:2": "texte" })).toBe(false);
  });
  it("réponse vide de la fiche ignorée", () => {
    expect(estPassageNonFiable("t3p", { 1: [], 2: "" }, {})).toBe(false);
    expect(normaliserValeurReponse([])).toBeNull();
  });
  it("passage copié de l'ancien système ou antérieur au 23/09 : jamais concerné", () => {
    expect(estPassageConcerne({ finishedAt: "2026-09-25T10:00:00Z", resultId: "x" })).toBe(false);
    expect(estPassageConcerne({ finishedAt: "2026-09-22T10:00:00Z", resultId: null })).toBe(false);
    expect(estPassageConcerne({ finishedAt: "2026-09-24T10:00:00Z", resultId: null })).toBe(true);
  });
});
