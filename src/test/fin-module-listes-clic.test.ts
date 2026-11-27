import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { decisionFinModule, MESSAGE_VERIFICATION_IMPOSSIBLE } from "@/lib/finModuleDecision";
import {
  etatServeurQuizModule, idsQuizConfirmes, listesQuizModule, moduleConfirmeServeur, texteListesQuiz,
  LIBELLES_STATUT_QUIZ, TITRE_QUIZ_CONFIRMES, TITRE_QUIZ_EN_ATTENTE,
} from "@/lib/quizStatutListes";
import { avecEtatServeur } from "@/lib/etatCompletionServeur";

// Données fictives : module 4, trois quiz. Questions serveur (module_editor_state) par quiz.
const A = "eleve-fictif";
const questions = new Map<string, string[]>([["100", ["1", "2"]], ["103", ["31", "32"]], ["104", ["41"]]]);
const requis = [{ id: "100", label: "Bilan T3P" }, { id: "103", label: "Bilan Français" }, { id: "104", label: "Bilan Anglais" }];
const remise = (ex: string, rep: Record<string, unknown>, apprenant_id = A) =>
  ({ apprenant_id, exercice_id: `module_4_exo_${ex}`, status: "submitted", submitted_at: "2026-11-27T10:00:00Z", reponses: rep });
// 100 couvert ; 103 remis avec des IDs projetés absents du serveur (non vérifiable) ; 104 selon le cas.
const base = [remise("100", { "100-1": "A", "100-2": "B" }), remise("103", { "103-9001": "A", "103-9002": "C" })];
const listes = (lignes: any[], extra: Record<string, unknown> = {}) =>
  listesQuizModule({ requis, serveur: etatServeurQuizModule(lignes, 4, A, questions), ...extra });
const sansSucces = { exosSoumis: new Set([100, 103]), quizRestants: [], quizValides: ["Bilan T3P", "Bilan Français"] };

describe("clic « Terminé » : mêmes listes que l'affichage", () => {
  it("remise non vérifiée : jamais dans les confirmés, en attente dans le texte de blocage", () => {
    const l = listes(base);
    const d = decisionFinModule({ etatServeur: null, ...sansSucces, listes: l });
    expect(d.action).toBe("bloquer");
    if (d.action !== "bloquer") return;
    // Seul le quiz réellement non répondu bloque ; la remise non vérifiée n'est pas un manquant bloquant.
    expect(d.manquants).toEqual([{ id: "104", label: "Bilan Anglais", statut: "non_repondu" }]);
    expect(d.message).toBe(`Module à terminer. ${texteListesQuiz(l)}`);
    const [confirmes, attente] = d.message.split(TITRE_QUIZ_EN_ATTENTE);
    expect(confirmes).toContain(`${TITRE_QUIZ_CONFIRMES} (1) : « Bilan T3P »`);
    expect(confirmes).not.toContain("Bilan Français");
    expect(attente).toContain(`« Bilan Français » (${LIBELLES_STATUT_QUIZ.remis_non_verifie})`);
    expect(attente).toContain(`« Bilan Anglais » (${LIBELLES_STATUT_QUIZ.non_repondu})`);
  });

  it("seules des remises non vérifiées restent : enregistrement, le serveur tranche (aucune sortie locale)", () => {
    const l = listes([...base, remise("104", { "104-41": "A" })]);
    expect(l.confirmes.map((q) => q.id)).toEqual(["100", "104"]);
    expect(l.enAttente).toEqual([{ id: "103", label: "Bilan Français", statut: "remis_non_verifie" }]);
    expect(decisionFinModule({ etatServeur: null, ...sansSucces, listes: l })).toEqual({ action: "enregistrer" });
  });

  it("ligne completed périmée + remise non vérifiée : erreur nommant le quiz en attente, jamais de succès", () => {
    const l = listes([...base, remise("104", { "104-41": "A" })]);
    const d = decisionFinModule({ etatServeur: { status: "completed", preuve_complete: false }, ...sansSucces, listes: l });
    expect(d.action).toBe("erreur");
    if (d.action !== "erreur") return;
    expect(d.message).toContain(`« Bilan Français » (${LIBELLES_STATUT_QUIZ.remis_non_verifie})`);
    expect(d.message).toContain(`${TITRE_QUIZ_CONFIRMES} (2)`);
  });

  it("remise partielle ou vide : jamais confirmée", () => {
    const l = listes([remise("100", { "100-1": "A", "100-2": "" }), remise("103", {}), remise("104", { "104-41": [] })]);
    expect(l.confirmes).toEqual([]);
    expect(l.enAttente.every((q) => q.statut === "remis_non_verifie")).toBe(true);
  });

  it("remise d'un autre compte ou révision : ignorée", () => {
    const l = listes([remise("104", { "104-41": "A" }, "autre"),
      { apprenant_id: A, exercice_id: "module_4_revision_exo_104", status: "submitted", submitted_at: "x", reponses: { "104-41": "A" } }, ...base]);
    expect(l.enAttente.find((q) => q.id === "104")?.statut).toBe("non_repondu");
  });

  it("lecture des listes en erreur au clic : aucun succès", () => {
    const enErreur = listesQuizModule({ requis, serveur: null });
    expect(decisionFinModule({ etatServeur: null, ...sansSucces, listes: enErreur })).toEqual({ action: "erreur", message: MESSAGE_VERIFICATION_IMPOSSIBLE });
    expect(decisionFinModule({ etatServeur: null, ...sansSucces, listes: null })).toEqual({ action: "erreur", message: MESSAGE_VERIFICATION_IMPOSSIBLE });
    expect(decisionFinModule({ etatServeur: undefined, ...sansSucces, listes: listes(base) }).action).toBe("erreur");
  });

  it("repli sans listes : une remise n'est jamais annoncée « confirmée »", () => {
    const d = decisionFinModule({ etatServeur: null, exosSoumis: new Set([100]), quizValides: [],
      quizRestants: [{ id: "100", label: "Bilan T3P" }, { id: "104", label: "Bilan Anglais" }] });
    expect(d.action).toBe("bloquer");
    if (d.action !== "bloquer") return;
    expect(d.message).not.toContain(TITRE_QUIZ_CONFIRMES);
    expect(d.message).toContain("Quiz remis au serveur (vérification par le serveur à l'enregistrement) (1) : « Bilan T3P »");
  });

  it("verdict serveur complet : sortie sans écriture, listes ignorées", () => {
    expect(decisionFinModule({ etatServeur: { status: "completed", preuve_complete: true }, ...sansSucces, listes: listes(base) })).toEqual({ action: "sortie" });
  });
});

describe("tableau de bord et détail : même état par compte", () => {
  it("verdict module confirmé strict et identique des deux côtés", () => {
    const cas = [
      { status: "completed", preuve_complete: true }, { status: "completed", preuve_complete: null },
      { status: "completed", preuve_complete: false }, { status: "in_progress", preuve_complete: true },
    ];
    for (const etat of cas) {
      // Détail : etat_completion_modules lu directement. Tableau de bord : ligne projetée par avecEtatServeur.
      const ligne = avecEtatServeur({ module_id: 4, status: etat.status } as any, new Map([[4, { module_id: 4, ...etat } as any]]));
      expect(moduleConfirmeServeur({ status: ligne.status, preuve_complete: (ligne as any).preuve_serveur })).toBe(moduleConfirmeServeur(etat));
    }
    expect(moduleConfirmeServeur({ status: "completed", preuve_complete: null })).toBe(false);
  });

  it("mêmes lignes serveur : mêmes listes et même compteur confirmés", () => {
    const lignes = [...base, remise("104", { "104-41": "A" })];
    const detail = listes(lignes, { reponsesLocales: () => 0 });
    const tableau = listes(lignes, { affichables: new Set(["100", "103", "104"]), moduleConfirme: false });
    expect(tableau).toEqual(detail);
    expect([...idsQuizConfirmes(detail)]).toEqual(["100", "104"]);
  });
});
