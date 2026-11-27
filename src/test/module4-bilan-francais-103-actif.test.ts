import { describe, it, expect } from "vitest";
import { exerciceVisibleApprenant } from "@/lib/exerciceVisibleApprenant";
import { BILAN_EXERCICES_VTC } from "@/components/cours-en-ligne/bilan-exercices-vtc-data";
import { VTC_COURS_DATA } from "@/components/cours-en-ligne/vtc-cours-data";
import { compterQuizModule } from "@/lib/moduleQuizCounter";
import { exosSoumisDuModule } from "@/lib/moduleProgressionReadModel";
import { decisionFinModule, listesStatutQuiz } from "@/lib/finModuleDecision";

// Inventaire du module 4 relu le 27/11 après réactivation (id, actif, nombre de questions), ordre conservé.
const MODULE4 = [
  { id: 100, actif: true, n: 206 }, { id: 101, actif: true, n: 171 }, { id: 102, actif: true, n: 241 },
  { id: 103, actif: true, n: 103 }, { id: 105, actif: true, n: 126 }, { id: 104, actif: true, n: 78 },
  { id: 106, actif: true, n: 53 },
];
const A = "eleve-fictif";
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
const soumis = (ids: number[], extra: any[] = []) => exosSoumisDuModule(
  [...ids.map((e) => ({ apprenant_id: A, exercice_id: `module_4_exo_${e}`, status: "submitted", submitted_at: "2026-11-25T21:00:00Z", reponses: {} })), ...extra] as any, 4, A);

// Module 9 (Bilan TAXI) relu le 27/11 après réactivation : même quiz Français 103 requis par d'anciens périmètres.
const MODULE9 = [100, 101, 102, 103, 105, 203, 204].map((id) => ({ id, actif: true }));
describe("Module 9 : quiz 103 « Bilan Français » réactivé", () => {
  it("visible pour l'élève TAXI, ordre conservé", () => {
    expect(MODULE9.filter((e) => exerciceVisibleApprenant(9, e)).map((e) => e.id)).toEqual([100, 101, 102, 103, 105, 203, 204]);
    expect(exerciceVisibleApprenant(9, { id: 103, actif: false })).toBe(false);
  });
});

describe("Module 4 : quiz 103 « Bilan Français » réactivé", () => {
  it("visible et ouvrable par l'élève, sans changer l'ordre ni les autres quiz", () => {
    const visibles = MODULE4.filter((e) => exerciceVisibleApprenant(4, e)).map((e) => e.id);
    expect(visibles).toEqual([100, 101, 102, 103, 105, 104, 106]);
    expect(exerciceVisibleApprenant(4, { id: 103, actif: false })).toBe(false);
  });
  it("contenu source inchangé : 103 = questions du Français (exercice 50) dans le même ordre", () => {
    const b = BILAN_EXERCICES_VTC.find((e) => e.id === 103)!;
    const src = VTC_COURS_DATA.exercices.find((e) => Number(e.id) === 50)!;
    expect(b.actif).toBe(true);
    expect(b.questions.map((q) => q.enonce)).toEqual(src.questions.map((q) => q.enonce));
    expect(b.questions.map((q) => q.choix)).toEqual(src.questions.map((q) => q.choix));
  });
  it("avant remise : 6/7, Français reste requis et la fin de module est bloquée", () => {
    const s = compterQuizModule([lignePerimee], [], { exosSoumis: soumis([100, 101, 102, 104, 105, 106]), preuveServeurComplete: null });
    expect(`${s.completedQuizzes}/${s.totalQuizzes}`).toBe("6/7");
    expect(s.remainingLabels).toEqual(["Bilan Français"]);
    const d = decisionFinModule({ etatServeur: { status: "completed", preuve_complete: false }, quizRestants: s.remainingQuizzes, exosSoumis: new Set([100, 101, 102, 104, 105, 106]) });
    expect(d.action).toBe("bloquer");
  });
  it("brouillon ou révision du 103 ne suffit pas ; 7/7 seulement après remise confirmée", () => {
    const bruit = [
      { apprenant_id: A, exercice_id: "module_4_exo_103", status: "in_progress", submitted_at: null, reponses: {} },
      { apprenant_id: A, exercice_id: "module_4_revision_exo_103", status: "submitted", submitted_at: "x", reponses: {} },
    ];
    const avant = compterQuizModule([lignePerimee], [], { exosSoumis: soumis([100, 101, 102, 104, 105, 106], bruit) });
    expect(`${avant.completedQuizzes}/${avant.totalQuizzes}`).toBe("6/7");
    const apres = compterQuizModule([lignePerimee], [], { exosSoumis: soumis([100, 101, 102, 103, 104, 105, 106]) });
    expect(`${apres.completedQuizzes}/${apres.totalQuizzes}`).toBe("7/7");
  });
});

describe("Module 4 : listes validés / à valider", () => {
  const six = [100, 101, 102, 104, 105, 106];
  const stats = compterQuizModule([lignePerimee], [], { exosSoumis: soumis(six) });
  it("6 validés nommés, Français seul en attente", () => {
    const { valides, enAttente } = listesStatutQuiz(stats, new Set(six));
    expect(valides).toEqual(["Bilan T3P", "Bilan Gestion", "Bilan Sécurité Routière", "Bilan Développement Commercial", "Bilan Anglais", "Bilan Réglementation Spécifique VTC"]);
    expect(enAttente.map((q) => q.label)).toEqual(["Bilan Français"]);
  });
  it("message de blocage : mêmes listes, libellé exact, jamais « jamais répondu »", () => {
    const d = decisionFinModule({ etatServeur: { status: "completed", preuve_complete: false }, quizRestants: stats.remainingQuizzes, exosSoumis: new Set(six), quizValides: stats.completedLabels });
    expect(d.action).toBe("bloquer");
    if (d.action !== "bloquer") return;
    expect(d.message).toBe("Module à terminer. Quiz confirmés par le serveur (6) : « Bilan T3P », « Bilan Gestion », « Bilan Sécurité Routière », « Bilan Développement Commercial », « Bilan Anglais », « Bilan Réglementation Spécifique VTC ». Quiz en attente ou indisponibles (1) : « Bilan Français » (aucune remise confirmée par le serveur).");
    expect(d.manquants.map((q) => q.id)).toEqual(["103"]);
  });
});
