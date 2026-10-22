import { describe, it, expect } from "vitest";
import { isCompletionDone } from "@/lib/moduleCompletion";
import { progressionModulesEleve } from "@/lib/progressionModulesEleve";

// Cas réel du 22/10/2026 (données fictives) : 7 modules attribués, 4 terminés
// avec preuves serveur, mais l'accueil affichait « 6 modules sur 7 » parce que
// seul le statut 'completed' compte — une date de fin seule ne prouve rien.
const MODULES = [
  { id: 26, nom: "Introduction" },
  { id: 2, nom: "Réglementation" },
  { id: 3, nom: "Formules" },
  { id: 4, nom: "Gestion" },
  { id: 35, nom: "Examens blancs" },
  { id: 5, nom: "Sécurité" },
  { id: 8, nom: "Pratique" },
];

describe("statut serveur des modules", () => {
  it("seul le statut 'completed' compte comme terminé", () => {
    expect(isCompletionDone({ module_id: 2, status: "completed" })).toBe(true);
    // Séquelle de l'ancien bug : date de fin posée sans validation => PAS terminé.
    expect(isCompletionDone({ module_id: 2, status: "in_progress", completed_at: "2026-10-09", progress: 100 })).toBe(false);
    // Lignes héritées d'avant la colonne status : date de fin = terminé.
    expect(isCompletionDone({ module_id: 2, status: null, completed_at: "2026-10-09" })).toBe(true);
    expect(isCompletionDone({ module_id: 2, status: "in_progress", progress: 100 })).toBe(false);
  });
});

describe("compteur d'accueil élève", () => {
  const done = (ids: number[]) => (id: number) => ids.includes(id);

  it("reproduit le cas affiché : 1 seul module 'completed' => 6 restants sur 7", () => {
    const p = progressionModulesEleve(MODULES, done([26]), new Set());
    expect(p.etat).toBe("ok");
    if (p.etat !== "ok") return;
    expect(p.termines).toBe(1);
    expect(p.total).toBe(7);
    expect(p.restants.length).toBe(6);
  });

  it("après bascule serveur des statuts prouvés : 4 terminés, 3 restants réels", () => {
    const p = progressionModulesEleve(MODULES, done([26, 2, 3, 4]), new Set());
    expect(p.etat).toBe("ok");
    if (p.etat !== "ok") return;
    expect(p.termines).toBe(4);
    expect(p.restants.map((r) => r.id)).toEqual([35, 5, 8]);
  });

  it("une progression à 100 % sans statut serveur ne compte jamais comme terminée", () => {
    const p = progressionModulesEleve(MODULES, () => false, new Set());
    expect(p.etat).toBe("ok");
    if (p.etat !== "ok") return;
    expect(p.termines).toBe(0);
  });
});
