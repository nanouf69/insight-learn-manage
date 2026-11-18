import { describe, expect, it } from "vitest";
import { filterAndSortApprenants } from "./apprenantSearch";

describe("recherche CRM par téléphone", () => {
  const rows = [
    { id: "national", nom: "Martin", telephone: "06 74 12 34 56" },
    { id: "international", nom: "Durand", telephone: "+33 6 74 98 76 54" },
    { id: "autre", nom: "Petit", telephone: "06 12 34 56 78" },
    { id: "vide", nom: "Sans téléphone", telephone: null },
  ];

  it.each(["06 74", "0674", "06.74", "06-74", "+33 6 74", "0033 6 74", "+33 (0)6 74", "(06) 74"])(
    "retrouve les deux formats avec %s", (query) => {
      expect(filterAndSortApprenants(rows, query).map((row) => row.id)).toEqual(["national", "international"]);
    },
  );
  it("ne mélange pas les chiffres de plusieurs champs", () => {
    expect(filterAndSortApprenants([{ telephone: "06", code_postal: "74000" }], "06 74")).toEqual([]);
  });
  it("ne renvoie pas tous les élèves pour une recherche trop courte", () => {
    expect(filterAndSortApprenants(rows, "06")).toEqual([]);
  });
  it("conserve la recherche nominative", () => {
    expect(filterAndSortApprenants(rows, "Martin").map((row) => row.id)).toEqual(["national"]);
  });
  it("conserve les recherches de dossier et de code postal", () => {
    const row = { numero_dossier_cma: "00088649", code_postal: "69003" };
    expect(filterAndSortApprenants([row], "88649")).toEqual([row]);
    expect(filterAndSortApprenants([row], "69003")).toEqual([row]);
    expect(filterAndSortApprenants([row], "69004")).toEqual([]);
  });
});