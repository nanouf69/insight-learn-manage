import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
const lire = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

describe("Consultation matière par matière d'un examen blanc", () => {
  const liste = lire("src/components/cours-en-ligne/ExamenBlancsListe.tsx");
  const res = lire("src/components/cours-en-ligne/ExamenBlancsResultats.tsx");
  const page = lire("src/components/cours-en-ligne/ExamensBlancsPage.tsx");
  it("un examen partiellement terminé propose la consultation des matières terminées", () => {
    expect(liste).toMatch(/else if \(completedMatiereCount > 0\) \{\s*partialIds\.add/);
    expect(liste).toContain("!isCompleted && partialExamIds.has(examen.id)");
    expect(liste).toContain("Voir les résultats des matières terminées");
  });
  it("une matière non terminée reste un simple emplacement, sans réponses ni corrigé", () => {
    expect(page).toMatch(/if \(!row\) \{[\s\S]{0,400}reponses: \{\},\s*nonPassee: true/);
    expect(res).toMatch(/if \(r\.nonPassee\) \{\s*return \(/);
    expect(res).toContain("matière non encore commencée par l'apprenant");
  });
  it("la correction IA élève ne lit que les passages des matières terminées", () => {
    expect(res).toContain("<CorrectionsIaEleve attemptIds={resultats.map((r: any) => r.__core?.attemptId).filter(Boolean)");
  });
});
