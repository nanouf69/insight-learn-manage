import { describe, expect, it } from "vitest";
import { compterReponsesSaisies, deciderCloture, finalisationBloqueeParRefus } from "@/lib/examClotureGarde";
import { classifyAnswerSaveFailure, MESSAGE_CLOTURE_VIDE_REFUSEE } from "@/lib/answerPersistence";

/**
 * KEVIN FERNANDES 19/10 : EB2__reglementation_vtc__t2, chrono expiré le 14/10,
 * 0 réponse côté serveur, 20 anciennes clôtures vides en file rejouées (P0530)
 * à chaque ouverture → panneau « Clôture refusée » permanent.
 */
const CLE = "EB2__reglementation_vtc__t2";
const BODY_P0530 = JSON.stringify({
  error: `Clôture refusée : examen blanc ${CLE} sans aucune réponse enregistrée. Rechargez normalement la page et attendez le chargement de vos réponses ; aucune donnée n'est supprimée.`,
  code: "P0530",
});

describe("Ancienne clôture vide (P0530) rejouée depuis la file", () => {
  it("P0530 : refus définitif avec code dédié et message honnête", () => {
    const v = classifyAnswerSaveFailure(400, BODY_P0530);
    expect(v.definitif).toBe(true);
    expect(v.code).toBe("cloture_vide");
    expect(v.message).toBe(MESSAGE_CLOTURE_VIDE_REFUSEE);
  });

  it("aucune réponse locale : le refus ne bloque plus, la garde décide « sans_reponse » (aucune écriture)", () => {
    const refus = { exerciceId: CLE, reason: "refused", code: "cloture_vide" };
    const locales = { "1": [], "2": "", "3": [null] }; // ce que contenaient les clôtures refusées
    const n = compterReponsesSaisies(locales);
    expect(n).toBe(0);
    expect(finalisationBloqueeParRefus(refus, CLE, n)).toBe(false);
    expect(deciderCloture({ reponsesChargees: true, routageResolu: true, ligneServeurTerminee: false, nbReponsesSaisies: n })).toBe("sans_reponse");
  });

  it("réponse locale réelle + P0530 : divergence, reste bloqué (jamais de note forcée)", () => {
    const refus = { exerciceId: CLE, reason: "refused", code: "cloture_vide" };
    expect(finalisationBloqueeParRefus(refus, CLE, compterReponsesSaisies({ "1": ["A"] }))).toBe(true);
  });

  it("autre tentative / autre matière : jamais concernée", () => {
    const refus = { exerciceId: CLE, reason: "refused", code: "cloture_vide" };
    expect(finalisationBloqueeParRefus(refus, "EB2__reglementation_vtc__t3", 0)).toBe(false);
    expect(finalisationBloqueeParRefus(refus, "EB2__reglementation_vtc2__t2", 0)).toBe(false);
  });

  it("matière déjà terminée : aucune réécriture", () => {
    expect(deciderCloture({ reponsesChargees: true, routageResolu: true, ligneServeurTerminee: true, nbReponsesSaisies: 0 })).toBe("deja_terminee");
  });

  it("refus 48 h (P0471) ou autre refus : toujours bloquant, même sans réponse", () => {
    const v = classifyAnswerSaveFailure(400, '{"error":"EXAM_RETAKE_DELAY_48H","code":"P0471"}');
    expect(v.reason).toBe("retake_delay");
    expect(v.code).toBeUndefined();
    expect(finalisationBloqueeParRefus({ exerciceId: CLE, reason: v.reason }, CLE, 0)).toBe(true);
    expect(finalisationBloqueeParRefus({ exerciceId: CLE, reason: "refused" }, CLE, 0)).toBe(true);
  });

  it("compatibilité : sans comptage fourni, comportement inchangé", () => {
    expect(finalisationBloqueeParRefus({ exerciceId: CLE, reason: "refused", code: "cloture_vide" }, CLE)).toBe(true);
  });
});
