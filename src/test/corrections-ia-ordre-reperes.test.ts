// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { numeroQuestionSnapshot } from "@/components/cours-en-ligne/CorrectionsIaEleve";
const src = readFileSync("src/components/cours-en-ligne/ExamenBlancsResultats.tsx", "utf8");
describe("Corrections IA en fin de page résultats", () => {
  it("le bloc IA vient après le bilan, la moyenne et les résultats par matière", () => {
    const ia = src.indexOf("<CorrectionsIaEleve"), bilan = src.indexOf("Examen blanc réussi"), attente = src.indexOf("En attente de correction des QRC");
    expect(ia).toBeGreaterThan(bilan); expect(ia).toBeGreaterThan(attente);
    expect(src.match(/<CorrectionsIaEleve/g)).toHaveLength(1);
  });
  it("numéro = position dans le snapshot figé (ordre 0/1), jamais inventé", () => {
    const qs = [{ id: "c", ordre: 2 }, { id: "a", ordre: 0 }, { id: "b", ordre: 1 }];
    expect(numeroQuestionSnapshot(qs, "a")).toBe(1);
    expect(numeroQuestionSnapshot(qs, "c")).toBe(3);
    expect(numeroQuestionSnapshot(qs, "zz")).toBeNull();
    expect(numeroQuestionSnapshot(undefined as any, "a")).toBeNull();
  });
});
