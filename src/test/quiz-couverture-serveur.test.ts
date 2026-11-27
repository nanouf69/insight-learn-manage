import { describe, expect, it, vi, beforeEach } from "vitest";

const quizServeur = vi.fn();
const reponses = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("@/lib/moduleProgressionReadModel", () => ({
  chargerQuizServeurModules: (...a: unknown[]) => quizServeur(...a),
  chargerReponsesQuizOrigine: (...a: unknown[]) => reponses(...a),
  projeterProgressionConfirmee: vi.fn(),
}));

import {
  etatServeurQuizModule, listesQuizModule, questionsServeurParExercice, quizServeurModule, statutBloquantEcran, LIBELLES_STATUT_QUIZ,
} from "@/lib/quizStatutListes";
import { chargerListesQuizRestants } from "@/hooks/useCandidatModules";

const A = "a-1";
const contenu = {
  exercices: [
    { id: 1, titre: "Quiz Un", questions: [{ id: 11 }, { id: 12 }, { id: 13, actif: false }] },
    { id: 2, titre: "Quiz Deux", deletedQuestionIds: [22], questions: [{ id: 21 }, { id: 22 }] },
    { id: 3, titre: "Quiz Inactif", actif: false, questions: [{ id: 31 }] },
  ],
};
const requis = [{ id: "1", label: "Quiz Un" }, { id: "2", label: "Quiz Deux" }];
const remise = (ex: string, rep: Record<string, unknown>, apprenant_id = A) =>
  ({ apprenant_id, exercice_id: `module_2_exo_${ex}`, status: "submitted", submitted_at: "2026-11-27T10:00:00Z", reponses: rep });

describe("questions serveur par quiz", () => {
  it("garde seulement les quiz et questions actifs non supprimés", () => {
    expect([...questionsServeurParExercice(contenu)]).toEqual([["1", ["11", "12"]], ["2", ["21"]]]);
    expect(quizServeurModule(contenu, [2]).map((q) => q.label)).toEqual(["Quiz Un"]);
  });
});

describe("couverture serveur d'une remise", () => {
  const q = questionsServeurParExercice(contenu);
  it("remise couvrant toutes les questions serveur = confirmée, score/total navigateur ignorés", () => {
    const l = listesQuizModule({ requis, serveur: etatServeurQuizModule([
      { ...remise("1", { "1-11": "A", "1-12": ["B"] }), score: 0, total_questions: 0 } as any,
      remise("2", { "2-21": "texte" })], 2, A, q) });
    expect(l.confirmes.map((x) => x.label)).toEqual(["Quiz Un", "Quiz Deux"]);
    expect(l.enAttente).toEqual([]);
  });
  it("remise partielle, vide ou avec une réponse blanche = remise non vérifiée, jamais confirmée", () => {
    for (const rep of [{}, { "1-11": "A" }, { "1-11": "A", "1-12": "" }, { "1-11": "A", "1-12": [] }]) {
      const l = listesQuizModule({ requis, serveur: etatServeurQuizModule([remise("1", rep), remise("2", { "2-21": "B" })], 2, A, q) });
      expect(l.confirmes.map((x) => x.id)).toEqual(["2"]);
      expect(l.enAttente).toEqual([{ id: "1", label: "Quiz Un", statut: "remis_non_verifie" }]);
    }
  });
  it("Bilan assemblé à l'écran (identifiants absents du contenu serveur) = non vérifiable côté serveur", () => {
    const l = listesQuizModule({ requis, serveur: etatServeurQuizModule([remise("1", { "1-970011": "A", "1-970012": "B" })], 2, A, q) });
    expect(l.enAttente[0]).toEqual({ id: "1", label: "Quiz Un", statut: "remis_non_verifie" });
    expect(LIBELLES_STATUT_QUIZ.remis_non_verifie).toBe("remis au serveur, couverture complète non vérifiable côté serveur");
  });
  it("quiz sans liste serveur (défini dans le code) = non vérifiable, jamais confirmé", () => {
    const l = listesQuizModule({ requis: [{ id: "9", label: "Quiz code" }], serveur: etatServeurQuizModule([{ ...remise("9", { "9-1": "A" }) }], 2, A, q) });
    expect(l.enAttente[0].statut).toBe("remis_non_verifie");
  });
  it("remise d'un autre compte, brouillon ou révision ne compte pas", () => {
    const l = listesQuizModule({ requis, serveur: etatServeurQuizModule([
      remise("1", { "1-11": "A", "1-12": "B" }, "autre"),
      { apprenant_id: A, exercice_id: "module_2_revision_exo_2", status: "submitted", submitted_at: "x", reponses: { "2-21": "B" } },
      { apprenant_id: A, exercice_id: "module_2_exo_2", status: "in_progress", submitted_at: null, reponses: { "2-21": "B" } },
    ], 2, A, q) });
    expect(l.confirmes).toEqual([]);
    expect(l.enAttente.map((x) => x.statut)).toEqual(["non_repondu", "non_confirme"]);
  });
  it("module validé par le verdict serveur : tous confirmés", () => {
    const l = listesQuizModule({ requis, moduleConfirme: true, serveur: etatServeurQuizModule([remise("1", {})], 2, A, q) });
    expect(l.enAttente).toEqual([]);
  });
  it("seuls les états non remis bloquent l'écran ; le serveur tranche les remises non vérifiées", () => {
    expect(statutBloquantEcran("remis_non_verifie")).toBe(false);
    for (const s of ["non_repondu", "non_confirme", "indisponible", "non_verifiable"] as const) expect(statutBloquantEcran(s)).toBe(true);
  });
});

describe("CRM : quiz des modules restants", () => {
  beforeEach(() => { quizServeur.mockReset(); reponses.mockReset(); });
  it("liste nominative par module, modules facultatifs / Bilans examen / EB exclus", async () => {
    quizServeur.mockResolvedValue(new Map([[2, quizServeurModule(contenu)]]));
    reponses.mockResolvedValue([remise("1", { "1-11": "A", "1-12": "B" }), remise("2", {})]);
    const r = await chargerListesQuizRestants(A, [2, 3, 5, 11, 36]);
    expect(quizServeur).toHaveBeenCalledWith([2]);
    expect(Object.keys(r)).toEqual(["2"]);
    expect(r[2].confirmes.map((x) => x.label)).toEqual(["Quiz Un"]);
    expect(r[2].enAttente).toEqual([{ id: "2", label: "Quiz Deux", statut: "remis_non_verifie" }]);
  });
  it("erreur de lecture serveur = non vérifiable, jamais confirmé", async () => {
    quizServeur.mockRejectedValue(new Error("réseau"));
    reponses.mockResolvedValue([]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await chargerListesQuizRestants(A, [2]);
    expect(r[2]).toEqual({ lisible: false, confirmes: [], enAttente: [] });
  });
});
