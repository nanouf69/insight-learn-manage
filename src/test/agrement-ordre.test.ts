import { describe, expect, it } from "vitest";
import { estLettrePresentation, separerLettresPresentation } from "@/lib/agrementOrdre";

describe("Ordre de la lettre de présentation", () => {
  it.each(["Lettre presentation", "Lettre de présentation", " LETTRE DE PRÉSENTATION "])("reconnaît %s", (label) => {
    expect(estLettrePresentation(label)).toBe(true);
  });
  it("conserve les identités, doublons et l’ordre des autres pièces sans mutation", () => {
    const pieces = [{ id: "a", label: "Autre" }, { id: "b", label: "Lettre presentation" }, { id: "c", label: "Kbis" }, { id: "d", label: "Lettre de présentation" }];
    const before = JSON.stringify(pieces);
    const { lettres, autres } = separerLettresPresentation(pieces);
    expect(lettres.map((p) => p.id)).toEqual(["b", "d"]);
    expect(autres.map((p) => p.id)).toEqual(["a", "c"]);
    expect(JSON.stringify(pieces)).toBe(before);
  });
});