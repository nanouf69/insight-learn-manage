import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import { decisionFinModule, messageListesQuiz, LIBELLE_NON_CONFIRME, LIBELLE_NON_REPONDU, MESSAGE_VERIFICATION_IMPOSSIBLE } from "@/lib/finModuleDecision";
import { INSTANTANE_OUVERTURE_ACTIF, ouvrirInstantaneQuiz, affichageConformeInstantane, questionsSansReponse } from "@/lib/quizInstantaneOuverture";

describe("quiz en attente : non confirmé ≠ non répondu", () => {
  it("nomme chaque quiz avec son état exact", () => {
    const m = messageListesQuiz(["Bilan T3P"], [
      { id: "103", label: "Bilan Français", reponsesLocales: 103 },
      { id: "104", label: "Bilan Anglais", reponsesLocales: 0 },
      { id: "105", label: "Bilan Gestion" },
    ]);
    expect(m).toContain(`« Bilan Français » (${LIBELLE_NON_CONFIRME})`);
    expect(m).toContain(`« Bilan Anglais » (${LIBELLE_NON_REPONDU})`);
    expect(m).toContain("« Bilan Gestion »,".slice(0, -1));
    expect(m).not.toContain("« Bilan Gestion » (");
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
