import { describe, it, expect } from "vitest";
import { decisionFinModule } from "@/lib/finModuleDecision";
import { compterQuizModule } from "@/lib/moduleQuizCounter";

// Données fictives calquées sur le cas : quiz 103 ajouté après validation, 106 soumis.
const ligneCompleted = {
  status: "completed", completed_at: "2026-07-10T10:00:00Z",
  details: [
    ...Array.from({ length: 3 }, (_, i) => ({ exerciceId: 103, exerciceTitre: "Bilan Français", questionId: i + 1, reponseEleve: null })),
    ...Array.from({ length: 2 }, (_, i) => ({ exerciceId: 106, exerciceTitre: "Bilan Réglementation Spécifique VTC", questionId: i + 1, reponseEleve: null })),
  ],
};
const preuve = compterQuizModule([ligneCompleted], []);

describe("Fin de module déjà validée (cas Arga)", () => {
  it("rechargement + validation serveur confirmée : sortie sans écriture malgré preuve historique incomplète", () => {
    const d = decisionFinModule({ completionServeurConfirmee: true, quizRestants: preuve.remainingQuizzes, exosSoumis: new Set([106]) });
    expect(d.action).toBe("sortie");
  });
  it("première validation : blocage strict maintenu", () => {
    const d = decisionFinModule({ completionServeurConfirmee: false, quizRestants: preuve.remainingQuizzes, exosSoumis: new Set([106]) });
    expect(d.action).toBe("bloquer");
  });
  it("nomme le quiz réellement manquant (103 Bilan Français), pas le quiz affiché 106", () => {
    const d = decisionFinModule({ completionServeurConfirmee: false, quizRestants: preuve.remainingQuizzes, exosSoumis: new Set([106]) });
    if (d.action !== "bloquer") throw new Error("attendu bloquer");
    expect(d.manquants.map(q => q.id)).toEqual(["103"]);
    expect(d.message).toContain("« Bilan Français » (3 questions sans réponse)");
    expect(d.message).not.toContain("Réglementation");
  });
  it("première validation sans manque : enregistrement serveur requis", () => {
    expect(decisionFinModule({ completionServeurConfirmee: false, quizRestants: [], exosSoumis: new Set() }).action).toBe("enregistrer");
  });
});
