import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import { decisionFinModule, messageListesQuiz, LIBELLE_NON_CONFIRME, LIBELLE_NON_REPONDU, MESSAGE_VERIFICATION_IMPOSSIBLE } from "@/lib/finModuleDecision";
import { enregistrerQuestionsAffichees } from "@/lib/quizAttempts";

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

describe("enregistrerQuestionsAffichees", () => {
  beforeEach(() => rpc.mockReset());
  it("envoie les identifiants exacts dédoublonnés pour une tentative d'origine", async () => {
    rpc.mockResolvedValue({ data: ["1", "2"], error: null });
    const r = await enregistrerQuestionsAffichees({ apprenantId: "a", exerciceId: "module_4_exo_103", questionIds: ["1", "2", "2", " "] });
    expect(rpc).toHaveBeenCalledWith("enregistrer_questions_affichees", { _apprenant_id: "a", _exercice_id: "module_4_exo_103", _question_ids: ["1", "2"] });
    expect(r).toEqual(["1", "2"]);
  });
  it("révision ou liste vide : aucun appel", async () => {
    expect(await enregistrerQuestionsAffichees({ apprenantId: "a", exerciceId: "module_4_revision_exo_103", questionIds: ["1"] })).toBeNull();
    expect(await enregistrerQuestionsAffichees({ apprenantId: "a", exerciceId: "module_4_exo_103", questionIds: [] })).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("erreur serveur : null, jamais une fausse liste", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0561" } });
    expect(await enregistrerQuestionsAffichees({ apprenantId: "a", exerciceId: "module_4_exo_103", questionIds: ["1"] })).toBeNull();
  });
});
