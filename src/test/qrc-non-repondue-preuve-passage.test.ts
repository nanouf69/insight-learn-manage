import { describe, expect, it } from "vitest";
import { verifierPassageV2 } from "@/lib/passagesV2NonFiables";
import type { CoreMatiereState } from "@/lib/coreExamPublication";

// Cas MALKI/SELMI 06/11 : QRC laissée vide, absente de l'ancienne fiche, corrigée 0 côté serveur.
const core = (proofs: Array<{ questionId: string; reponse: unknown }>): CoreMatiereState => ({
  attemptId: "a1", examId: "EB1", matiereId: "t3p", finishedAt: "2026-11-06T09:16:01Z",
  qrcTotal: proofs.length, qrcRestantes: 0, status: "definitif", note20: 3.5, pending: false,
  answers: Object.fromEntries(proofs.filter((p) => p.reponse != null).map((p) => [p.questionId, p.reponse])),
  qrcProofs: proofs.map((p) => ({ ...p, etat: "corrigee", note: 0 })),
});

describe("preuve même passage avec QRC non répondue", () => {
  it("QRC vide des deux côtés : passage fiable", () => {
    const c = core([{ questionId: "t3p:1", reponse: "Carte pro" }, { questionId: "t3p:5", reponse: null }]);
    expect(verifierPassageV2(c, { "1": "Carte pro" })).toBe("fiable");
  });
  it("réponse serveur non vide absente de la fiche : non vérifiable", () => {
    const c = core([{ questionId: "t3p:1", reponse: "Carte pro" }, { questionId: "t3p:5", reponse: "Avertissement" }]);
    expect(verifierPassageV2(c, { "1": "Carte pro" })).toBe("non_verifiable");
  });
  it("réponse différente : non fiable", () => {
    const c = core([{ questionId: "t3p:1", reponse: "Carte pro" }]);
    expect(verifierPassageV2(c, { "1": "Autre" })).toBe("non_fiable");
  });
});
