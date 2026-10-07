import { describe, expect, it } from "vitest";
import { estLettrePresentation, fichiersPourExtra, piecesPourDossier, separerLettresPresentation } from "@/lib/agrementOrdre";

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

describe("Lettre commune TAXI/VTC sans copie", () => {
  const pieces = [
    { id: "lettre-vtc", label: "Lettre presentation", societe: "opto", dossier: "vtc" },
    { id: "lettre-taxi", label: "Lettre de présentation", societe: "opto", dossier: "taxi" },
    { id: "autre", label: "Annexe VTC", societe: "opto", dossier: "vtc" },
    { id: "societe", label: "Lettre presentation", societe: "services_pro", dossier: "taxi" },
  ];
  it("partage toutes les lettres sans mélanger les sociétés ou les autres pièces", () => {
    expect(piecesPourDossier(pieces, "opto", "taxi").map((p) => p.id)).toEqual(["lettre-vtc", "lettre-taxi"]);
    expect(piecesPourDossier(pieces, "opto", "vtc")).toEqual(pieces.slice(0, 3));
    expect(piecesPourDossier(pieces, "opto", "taxi")[0]).toBe(pieces[0]);
  });
  it("lit le même fichier historique, les ajouts communs et les anciennes versions des deux côtés", () => {
    const fichiers = [
      { id: "ancien", piece_code: "extra:lettre-vtc", dossier: "vtc", remplace_par: "actuel" },
      { id: "actuel", piece_code: "extra:lettre-vtc", dossier: "vtc", remplace_par: null },
      { id: "ajout", piece_code: "extra:lettre-vtc", dossier: "commun", remplace_par: null },
      { id: "autre", piece_code: "extra:autre", dossier: "vtc", remplace_par: null },
    ];
    const before = JSON.stringify(fichiers);
    for (const dossier of ["taxi", "vtc"]) {
      expect(fichiersPourExtra(fichiers, pieces[0], dossier, false).map((f) => f.id)).toEqual(["actuel", "ajout"]);
      expect(fichiersPourExtra(fichiers, pieces[0], dossier, true).map((f) => f.id)).toEqual(["ancien"]);
    }
    expect(fichiersPourExtra(fichiers, pieces[2], "taxi", false)).toEqual([]);
    expect(JSON.stringify(fichiers)).toBe(before);
  });
});