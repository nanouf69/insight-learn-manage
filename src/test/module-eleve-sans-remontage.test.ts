import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// 31/10 : en production, la page élève recréait « Retour » à chaque rendu ; le bloc
// élève du module dépendait de ces fonctions et se remontait 3-4 fois par seconde
// (journal : ~1 ouverture de cours / 0,3 s). Contre-épreuve navigateur faite :
// ancien code = support rechargé à chaque rendu, nouveau = conservé.
const mdv = readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
const cp = readFileSync("src/pages/CoursPublic.tsx", "utf8");

describe("module élève : pas de remontage quand la page parente se redessine", () => {
  it("le bloc élève ne dépend pas de l'identité des fonctions du parent", () => {
    const deps = mdv.match(/return LearnerPreviewComponent;[\s\S]*?\}, \[([^\]]*)\]\);/);
    expect(deps).not.toBeNull();
    for (const cb of ["onBack", "onTrackCours", "onLearnerActivity", "onModuleCompleted"]) {
      expect(deps![1]).not.toMatch(new RegExp(`\\b${cb}\\b`));
    }
  });

  it("le bouton Retour passé au module est une fonction stable", () => {
    expect(cp).toMatch(/onBack=\{handleRetourModule\}/);
    expect(cp).toMatch(/const handleRetourModule = useCallback\([\s\S]*?, \[\]\);/);
  });
});
