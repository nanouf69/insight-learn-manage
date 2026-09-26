// @vitest-environment node
import { describe, it, expect } from "vitest";
import { lireIdentifiantExerciceModule, buildRevisionExerciceId } from "@/lib/quizAttempts";
import { computeConnexionDetail } from "@/lib/reports/connexion-detail-rows";

describe("Rapports d'heures — révisions rattachées au même module/exercice", () => {
  it("lecture de l'identifiant", () => {
    expect(lireIdentifiantExerciceModule("module_2_exo_61")).toEqual({ moduleId: 2, exoId: "61", revision: false });
    expect(lireIdentifiantExerciceModule(buildRevisionExerciceId(2, 61))).toEqual({ moduleId: 2, exoId: "61", revision: true });
    expect(lireIdentifiantExerciceModule("EB1__A")).toBeNull();
  });
  it("le temps de révision apparaît dans le détail de connexion, libellé (révision)", () => {
    const c = { started_at: "2026-09-26T08:00:00Z", ended_at: "2026-09-26T09:00:00Z" };
    const d = computeConnexionDetail(c, [], [], [{ updated_at: "2026-09-26T08:30:00Z", exercice_id: "module_2_revision_exo_61" }]);
    expect(d.cours_exercices.some((l) => l.includes("(révision)"))).toBe(true);
    expect(d.modules_consultes[0]).toContain("(déduit)");
  });
  it("aucun changement de la règle de validation (applySubmittedAttempts ignore toujours les révisions)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
    expect(src).not.toContain("lireIdentifiantExerciceModule");
  });
});
