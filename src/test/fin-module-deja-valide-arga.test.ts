import { describe, it, expect } from "vitest";
import { decisionFinModule, MESSAGE_VERIFICATION_IMPOSSIBLE } from "@/lib/finModuleDecision";
import { compterQuizModule } from "@/lib/moduleQuizCounter";
import { exosSoumisDuModule } from "@/lib/moduleProgressionReadModel";

// Données fictives calquées sur l'incident : ligne « completed » du 10/07, 112/763 réponses (Anglais seul).
const tailles: Record<number, [string, number, number]> = {
  100: ["Bilan T3P", 128, 0], 101: ["Bilan Gestion", 94, 0], 102: ["Bilan Sécurité Routière", 211, 0],
  103: ["Bilan Français", 103, 0], 104: ["Bilan Développement Commercial", 66, 0],
  105: ["Bilan Anglais", 126, 112], 106: ["Bilan Réglementation Spécifique VTC", 35, 0],
};
const lignePerimee = {
  module_id: 4, status: "completed", completed_at: "2026-07-10T21:21:35Z",
  details: Object.entries(tailles).flatMap(([exo, [titre, n, rep]]) =>
    Array.from({ length: n }, (_, i) => ({ exerciceId: Number(exo), exerciceTitre: titre, questionId: i + 1, reponseEleve: i < rep ? "A" : null }))),
};
const A = "eleve-fictif";
const tentatives = [100, 101, 102, 104, 105, 106].map((e) => ({ apprenant_id: A, exercice_id: `module_4_exo_${e}`, status: "submitted", submitted_at: "2026-11-25T21:00:00Z", reponses: {} }));
const soumisAffichage = exosSoumisDuModule(tentatives, 4, A);
const soumisEcran = new Set([...soumisAffichage].map(Number));
const preuve = compterQuizModule([lignePerimee], []);

describe("Incident module 4 : ligne completed périmée", () => {
  it("la ligne périmée compte 763 questions dont 112 seulement répondues", () => {
    expect(lignePerimee.details.length).toBe(763);
    expect(lignePerimee.details.filter((d) => d.reponseEleve).length).toBe(112);
  });
  it("compteur du tableau de bord : 6/7, seul « Bilan Français » restant", () => {
    const s = compterQuizModule([lignePerimee], [], { exosSoumis: soumisAffichage, preuveServeurComplete: null });
    expect(`${s.completedQuizzes}/${s.totalQuizzes}`).toBe("6/7");
    expect(s.remainingLabels).toEqual(["Bilan Français"]);
  });
  it("révisions, autre compte et tentatives non soumises ne comptent pas", () => {
    const bruit = [
      { apprenant_id: A, exercice_id: "module_4_revision_exo_103", status: "submitted", submitted_at: "x", reponses: {} },
      { apprenant_id: "autre", exercice_id: "module_4_exo_103", status: "submitted", submitted_at: "x", reponses: {} },
      { apprenant_id: A, exercice_id: "module_4_exo_103", status: "in_progress", submitted_at: null, reponses: {} },
    ];
    expect(exosSoumisDuModule(bruit as any, 4, A).has("103")).toBe(false);
  });
  it("Terminé : serveur completed mais preuve incomplète => blocage sur 103, aucun succès", () => {
    const d = decisionFinModule({ etatServeur: { status: "completed", preuve_complete: false }, quizRestants: preuve.remainingQuizzes, exosSoumis: soumisEcran });
    expect(d.action).toBe("bloquer");
    if (d.action !== "bloquer") return;
    expect(d.manquants.map((q) => q.id)).toEqual(["103"]);
    expect(d.message).toContain("« Bilan Français » (103 questions sans réponse)");
  });
  it("preuve incomplète sans quiz identifiable : erreur, jamais de sortie", () => {
    expect(decisionFinModule({ etatServeur: { status: "completed", preuve_complete: false }, quizRestants: [], exosSoumis: new Set() }).action).toBe("erreur");
  });
  it("lecture serveur en erreur : blocage avec nouvel essai", () => {
    const d = decisionFinModule({ etatServeur: undefined, quizRestants: [], exosSoumis: new Set() });
    expect(d).toEqual({ action: "erreur", message: MESSAGE_VERIFICATION_IMPOSSIBLE });
  });
  it("première validation avec quiz manquant : blocage", () => {
    expect(decisionFinModule({ etatServeur: null, quizRestants: preuve.remainingQuizzes, exosSoumis: soumisEcran }).action).toBe("bloquer");
  });
  it("vraie complétion 7/7 confirmée par le serveur : sortie sans écriture et compteur 7/7", () => {
    const soumis7 = new Set([...soumisEcran, 103]);
    expect(decisionFinModule({ etatServeur: { status: "completed", preuve_complete: true }, quizRestants: preuve.remainingQuizzes, exosSoumis: soumis7 }).action).toBe("sortie");
    const s = compterQuizModule([lignePerimee], [], { preuveServeurComplete: true });
    expect(`${s.completedQuizzes}/${s.totalQuizzes}`).toBe("7/7");
  });
  it("première validation sans manque : enregistrement serveur requis", () => {
    expect(decisionFinModule({ etatServeur: null, quizRestants: [], exosSoumis: new Set() }).action).toBe("enregistrer");
  });
});
