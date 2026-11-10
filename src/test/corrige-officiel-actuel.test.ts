import { describe, expect, it } from "vitest";
import { corrigeActuelPour, indexerCorrigesActuels } from "@/lib/corrigeOfficielActuel";

const ligne = {
  attempt_id: "att-1", question_id: "francais:4",
  bonnes_passage: ["C"], bonnes_actuelles: ["A", "C"], version: 23, publiee_le: "2026-11-10T15:59:36Z",
};

describe("corrigé officiel actuel (EB3 Français Q4 titiller)", () => {
  it("affiche A+C quand le passage figé n'avait que C", () => {
    const carte = indexerCorrigesActuels([ligne]);
    expect(corrigeActuelPour(carte, "att-1", "francais", 4, ["C"])?.bonnes_actuelles).toEqual(["A", "C"]);
  });
  it("n'affiche rien si le corrigé du passage est déjà le corrigé actuel", () => {
    const carte = indexerCorrigesActuels([ligne]);
    expect(corrigeActuelPour(carte, "att-1", "francais", 4, ["C", "A"])).toBeNull();
  });
  it("ne mélange jamais deux tentatives ni deux matières", () => {
    const carte = indexerCorrigesActuels([ligne]);
    expect(corrigeActuelPour(carte, "att-2", "francais", 4, ["C"])).toBeNull();
    expect(corrigeActuelPour(carte, "att-1", "anglais", 4, ["C"])).toBeNull();
  });
  it("ignore un corrigé actuel vide ou une réponse illisible", () => {
    expect(indexerCorrigesActuels([{ ...ligne, bonnes_actuelles: [] }]).size).toBe(0);
    expect(indexerCorrigesActuels(null).size).toBe(0);
  });
});
