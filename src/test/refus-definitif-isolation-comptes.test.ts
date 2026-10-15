import { beforeEach, describe, expect, it } from "vitest";
import {
  getAnswerSaveRejectionFor,
  setAnswerSaveAuthToken,
  classifyAnswerSaveFailure,
  __testRecordDefinitiveRejection,
  __testConfirmSave,
} from "@/lib/answerPersistence";
import { finalisationBloqueeParRefus } from "@/lib/examClotureGarde";

const CLE = "EB2__reglementation_vtc__t2";
const A = { user: "user-A", app: "app-A" };
const B = { user: "user-B", app: "app-B" };

describe("Refus définitif : isolé par compte + dossier + exercice", () => {
  beforeEach(() => setAnswerSaveAuthToken(null, null));

  it("tablette partagée : le refus de A ne bloque pas B sur la même clé", () => {
    setAnswerSaveAuthToken("tA", A.user);
    __testRecordDefinitiveRejection(A.user, A.app, CLE, "refused", "Clôture refusée");
    expect(finalisationBloqueeParRefus(getAnswerSaveRejectionFor(A.app, CLE), CLE)).toBe(true);
    setAnswerSaveAuthToken("tB", B.user);
    expect(getAnswerSaveRejectionFor(B.app, CLE)).toBeNull();
    // Même si B ouvrait le dossier de A (impossible côté serveur), compte actif différent.
    expect(getAnswerSaveRejectionFor(A.app, CLE)).toBeNull();
  });

  it("une sauvegarde confirmée ultérieure lève le refus", () => {
    setAnswerSaveAuthToken("tA", A.user);
    __testRecordDefinitiveRejection(A.user, A.app, CLE, "refused");
    __testConfirmSave(A.user, A.app, CLE);
    expect(getAnswerSaveRejectionFor(A.app, CLE)).toBeNull();
  });

  it("nouvelle tentative (autre clé) : jamais bloquée par l'ancien refus", () => {
    setAnswerSaveAuthToken("tA", A.user);
    __testRecordDefinitiveRejection(A.user, A.app, CLE, "refused");
    expect(getAnswerSaveRejectionFor(A.app, "EB2__reglementation_vtc__t3")).toBeNull();
  });

  it("panne réseau/5xx n'est pas définitive ; P0530 l'est", () => {
    expect(classifyAnswerSaveFailure(503, "Service Unavailable").definitif).toBe(false);
    expect(classifyAnswerSaveFailure(500, "internal server error").definitif).toBe(false);
    expect(classifyAnswerSaveFailure(400, '{"code":"P0530"}').definitif).toBe(true);
  });

  it("'frozen' n'est jamais mémorisé comme blocage", () => {
    setAnswerSaveAuthToken("tA", A.user);
    __testRecordDefinitiveRejection(A.user, A.app, CLE, "frozen");
    expect(getAnswerSaveRejectionFor(A.app, CLE)).toBeNull();
  });
});
