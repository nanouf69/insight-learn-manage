import { describe, expect, it } from "vitest";
import { cleOperationCommentaire, commentaireConfirme, versionCommentaire } from "./commentaireSeul";
import { commentaireHistoriqueAffiche } from "@/lib/commentairesHistoriquesEleve";
import { commentaireQrcPersistant } from "@/lib/commentaireQrcPersistant";

const ev = (o: Record<string, unknown>) => ({ etat_precedent: "corrigee", etat_nouveau: "corrigee", note_precedente: 1, note_nouvelle: 1, corrige_email: null, created_at: "2026-11-10T13:00:00Z", ...o });

describe("commentaire seul QRC", () => {
  it("version = dernier événement V2 et dernière révision historique", () => {
    expect(versionCommentaire([])).toEqual({ dernierEvenement: null, revision: 0 });
    expect(versionCommentaire([ev({ correction_event_id: 9 }), ev({ correction_event_id: 10 })])).toEqual({ dernierEvenement: 10, revision: 0 });
    expect(versionCommentaire([ev({ revision: 1 }), ev({ revision: 3 })])).toEqual({ dernierEvenement: null, revision: 3 });
  });
  it("même intention = même opération ; texte ou version différents = autre opération", () => {
    const v = { dernierEvenement: 7, revision: 0 };
    expect(cleOperationCommentaire("q", v, "Précisez !!!", "j")).toBe(cleOperationCommentaire("q", v, "Précisez !!!", "j"));
    expect(cleOperationCommentaire("q", v, "Précisez !!!", "j")).not.toBe(cleOperationCommentaire("q", v, "Mal dit !!!", "j"));
    expect(cleOperationCommentaire("q", v, "x", "j")).not.toBe(cleOperationCommentaire("q", { dernierEvenement: 8, revision: 0 }, "x", "j"));
  });
  it("confirmation seulement si le dernier événement porte le texte exact et la même note", () => {
    expect(commentaireConfirme([ev({ commentaire: "Précisez !!!" })], "Précisez !!!", 1)).toBe(true);
    expect(commentaireConfirme([ev({ commentaire: "Précisez !!!", note_nouvelle: 0.5 })], "Précisez !!!", 1)).toBe(false);
    expect(commentaireConfirme([ev({ commentaire: "autre" })], "Précisez !!!", 1)).toBe(false);
    expect(commentaireConfirme([ev({ commentaire: null })], "", 1)).toBe(true);
    expect(commentaireConfirme([], "x", 1)).toBe(false);
  });
  it("candidat V2 : dernier événement par identifiant numérique (10 après 9) au même instant", () => {
    const base = { qrc_instance_id: "i", attempt_id: "a", question_id: "q", apprenant_id: "p", created_at: "2026-11-10T13:00:00Z", note_nouvelle: 1 };
    const events = [{ ...base, correction_event_id: 9, commentaire: "ancien" }, { ...base, correction_event_id: 10, commentaire: "Mal dit !!!" }];
    expect(commentaireQrcPersistant(events, { qrc_instance_id: "i", attempt_id: "a", question_id: "q", apprenant_id: "p", note: 1 })).toBe("Mal dit !!!");
  });
  it("candidat ancienne copie : journal prioritaire seulement pour la note actuelle", () => {
    const j = new Map([["r1:3", { result_id: "r1", question_id: "3", note: 1.5, commentaire: "Attention aux fautes !!!", revision: 2 }]]);
    expect(commentaireHistoriqueAffiche(j, "r1", 3, { pointsObtenus: 1.5, commentaire: "" })).toBe("Attention aux fautes !!!");
    expect(commentaireHistoriqueAffiche(j, "r1", 3, { pointsObtenus: 2, commentaire: "copie" })).toBe("copie");
    expect(commentaireHistoriqueAffiche(j, "r2", 3, { pointsObtenus: 1.5, commentaire: "copie" })).toBe("copie");
    expect(commentaireHistoriqueAffiche(null, "r1", 3, { pointsObtenus: 1.5, commentaire: "copie" })).toBe("copie");
  });
});
