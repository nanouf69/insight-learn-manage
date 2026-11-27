import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import { decisionFinModule, messageListesQuiz, LIBELLE_NON_CONFIRME, LIBELLE_NON_REPONDU, LIBELLE_SANS_REMISE_SERVEUR, MESSAGE_VERIFICATION_IMPOSSIBLE } from "@/lib/finModuleDecision";
import { etatServeurQuizModule, listesQuizModule, texteListesQuiz, LIBELLES_STATUT_QUIZ } from "@/lib/quizStatutListes";
import { INSTANTANE_OUVERTURE_ACTIF, ouvrirInstantaneQuiz, affichageConformeInstantane, questionsSansReponse } from "@/lib/quizInstantaneOuverture";

describe("quiz en attente : non confirmé ≠ non répondu", () => {
  it("nomme chaque quiz avec son état exact", () => {
    const m = messageListesQuiz(["Bilan T3P"], [
      { id: "103", label: "Bilan Français", reponsesLocales: 103 },
      { id: "104", label: "Bilan Anglais", reponsesLocales: 0 },
      { id: "105", label: "Bilan Gestion" },
    ]);
    expect(m).toContain(`« Bilan Français » (${LIBELLE_NON_CONFIRME})`);
    // Sans lecture serveur des brouillons, « non répondu » n'est jamais affirmé.
    expect(m).toContain(`« Bilan Anglais » (${LIBELLE_SANS_REMISE_SERVEUR})`);
    expect(m).not.toContain(LIBELLE_NON_REPONDU);
    expect(m).not.toContain("À valider");
    expect(m).toContain(`« Bilan Gestion » (${LIBELLE_SANS_REMISE_SERVEUR})`);
  });

  it("réponses locales sans remise serveur : jamais de succès", () => {
    const d = decisionFinModule({ etatServeur: { status: "completed", preuve_complete: false },
      quizRestants: [{ id: "103", label: "Bilan Français", reponsesLocales: 103 }], exosSoumis: new Set() });
    expect(d.action).toBe("bloquer");
  });

  it("lecture serveur en erreur : aucun succès", () => {
    const d = decisionFinModule({ etatServeur: undefined, quizRestants: [], exosSoumis: new Set([103]) });
    expect(d).toEqual({ action: "erreur", message: MESSAGE_VERIFICATION_IMPOSSIBLE });
  });
});

describe("instantané serveur à l'ouverture (candidat, désactivé)", () => {
  beforeEach(() => rpc.mockReset());
  it("reste désactivé tant que le SQL candidat n'est pas appliqué", () => {
    expect(INSTANTANE_OUVERTURE_ACTIF).toBe(false);
  });
  it("n'envoie aucune liste : seulement compte et tentative d'origine", async () => {
    rpc.mockResolvedValue({ data: [{ question_ids: ["1", "2"], empreinte: "e" }], error: null });
    expect(await ouvrirInstantaneQuiz("a", "module_4_exo_103")).toEqual({ etat: "ok", questionIds: ["1", "2"], empreinte: "e" });
    expect(rpc).toHaveBeenCalledWith("ouvrir_quiz_instantane", { _apprenant_id: "a", _exercice_id: "module_4_exo_103" });
  });
  it("révision : règle précédente, aucun appel", async () => {
    expect(await ouvrirInstantaneQuiz("a", "module_4_revision_exo_103")).toEqual({ etat: "regle_precedente" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("erreur de lecture/écriture serveur : erreur réessayable, jamais de liste", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0573" } });
    expect((await ouvrirInstantaneQuiz("a", "module_4_exo_103")).etat).toBe("erreur");
    rpc.mockRejectedValue(new Error("réseau"));
    expect((await ouvrirInstantaneQuiz("a", "module_4_exo_103")).etat).toBe("erreur");
    rpc.mockResolvedValue({ data: [], error: null });
    expect((await ouvrirInstantaneQuiz("a", "module_4_exo_103")).etat).toBe("erreur");
  });
  it("tentative antérieure ou quiz non couvert : règle précédente", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0571" } });
    expect(await ouvrirInstantaneQuiz("a", "module_4_exo_103")).toEqual({ etat: "regle_precedente" });
  });
  it("affichage différent, doublon ou question en plus : non conforme", () => {
    expect(affichageConformeInstantane(["2", "1"], ["1", "2"])).toBe(true);
    expect(affichageConformeInstantane(["1", "1"], ["1", "2"])).toBe(false);
    expect(affichageConformeInstantane(["1", "2", "3"], ["1", "2"])).toBe(false);
    expect(affichageConformeInstantane(["1"], ["1", "2"])).toBe(false);
  });
  it("réponses partielles détectées contre l'instantané", () => {
    expect(questionsSansReponse(103, ["1", "2", "3"], { "103-1": "A", "103-2": [], "103-3": " " })).toEqual(["2", "3"]);
    expect(questionsSansReponse(103, ["1"], { "103-1": ["B"] })).toEqual([]);
  });
});

describe("listes nominatives tableau de bord / détail (preuve serveur)", () => {
  const A = "a";
  const requis = ["100", "101", "102", "103", "104", "105", "106"].map((id) => ({ id, label: `Bilan ${id}` }));
  const lignes = [
    ...["100", "101", "102", "104", "105", "106"].map((ex) => ({ apprenant_id: A, exercice_id: `module_4_exo_${ex}`, status: "submitted", submitted_at: "2026-11-25T10:00:00Z", reponses: {} })),
  ];
  it("cas Arga : 6 confirmés par titre, Bilan Français seul en attente « non répondu »", () => {
    const l = listesQuizModule({ requis, serveur: etatServeurQuizModule(lignes, 4, A) });
    expect(l.confirmes.map((q) => q.id)).toEqual(["100", "101", "102", "104", "105", "106"]);
    expect(l.enAttente).toEqual([{ id: "103", label: "Bilan 103", statut: "non_repondu" }]);
    expect(texteListesQuiz(l)).toContain(`« Bilan 103 » (${LIBELLES_STATUT_QUIZ.non_repondu})`);
    expect(texteListesQuiz(l)).not.toContain("À valider");
  });
  it("brouillon serveur ou réponses locales = réponses présentes, non confirmées", () => {
    const brouillon = [...lignes, { apprenant_id: A, exercice_id: "module_4_exo_103", status: "draft", submitted_at: null, reponses: { "103-1": "A" } }];
    expect(listesQuizModule({ requis, serveur: etatServeurQuizModule(brouillon, 4, A) }).enAttente[0].statut).toBe("non_confirme");
    expect(listesQuizModule({ requis, serveur: etatServeurQuizModule(lignes, 4, A), reponsesLocales: (id) => (id === "103" ? 2 : 0) }).enAttente[0].statut).toBe("non_confirme");
  });
  it("révision, autre compte, autre module ou brouillon vide ne confirment rien", () => {
    const bruit = [
      { apprenant_id: A, exercice_id: "module_4_revision_exo_103", status: "submitted", submitted_at: "x", reponses: { "103-1": "A" } },
      { apprenant_id: "b", exercice_id: "module_4_exo_103", status: "submitted", submitted_at: "x", reponses: {} },
      { apprenant_id: A, exercice_id: "module_9_exo_103", status: "submitted", submitted_at: "x", reponses: {} },
      { apprenant_id: A, exercice_id: "module_4_exo_103", status: "draft", submitted_at: null, reponses: { "103-1": "", "103-2": [] } },
    ];
    const l = listesQuizModule({ requis, serveur: etatServeurQuizModule(bruit, 4, A) });
    expect(l.confirmes).toEqual([]);
    expect(l.enAttente.find((q) => q.id === "103")?.statut).toBe("non_repondu");
  });
  it("lecture serveur en erreur : aucun confirmé, tout « non vérifiable », jamais un succès", () => {
    const l = listesQuizModule({ requis, serveur: null, moduleConfirme: true });
    expect(l.lisible).toBe(false);
    expect(l.confirmes).toEqual([]);
    expect(l.enAttente.every((q) => q.statut === "non_verifiable")).toBe(true);
  });
  it("quiz exigé absent de l'écran = indisponible ; verdict serveur complet = tous confirmés", () => {
    const l = listesQuizModule({ requis, serveur: etatServeurQuizModule(lignes, 4, A), affichables: new Set(["100", "101", "102", "104", "105", "106"]) });
    expect(l.enAttente).toEqual([{ id: "103", label: "Bilan 103", statut: "indisponible" }]);
    expect(listesQuizModule({ requis, serveur: etatServeurQuizModule([], 4, A), moduleConfirme: true }).confirmes).toHaveLength(7);
  });
  it("doublons de quiz exigés comptés une seule fois", () => {
    expect(listesQuizModule({ requis: [...requis, requis[0]], serveur: etatServeurQuizModule(lignes, 4, A) }).confirmes).toHaveLength(6);
  });
});
