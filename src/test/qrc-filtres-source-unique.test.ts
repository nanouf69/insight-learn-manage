// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getQrcQueueIdentity, isInTentativeScope, isBlockingQrcItem, buildAnswerSignature } from "@/components/cours-en-ligne/CorrectionQRCTab";

const qrc = (
  tentative: number | undefined,
  questionId = 7,
  opts: { reponseEleve?: string; corrigeManuel?: boolean } = {},
) => ({
  apprenantId: "A1",
  quizId: "EB2",
  passageKey: `A1__examen_blanc__EB2__gestion__T${tentative ?? "inconnue"}`,
  matiereId: "gestion",
  questionId,
  dbTentative: tentative,
  reponseEleve: opts.reponseEleve ?? "",
  corrigeManuel: opts.corrigeManuel ?? true,
});

describe("Correction QRC — périmètre unique des compteurs et listes", () => {
  it("Tentative 1 exclut les tentatives 2+ non bloquantes et les passages non attribués", () => {
    expect(isInTentativeScope(qrc(1), "1")).toBe(true);
    expect(isInTentativeScope(qrc(2), "1")).toBe(false);
    expect(isInTentativeScope(qrc(undefined), "1")).toBe(false);
  });

  it("Le filtre tentative 1 ne masque JAMAIS une QRC qui bloque un résultat", () => {
    const bloquante = qrc(2, 7, { reponseEleve: "Le livret de métrologie", corrigeManuel: false });
    expect(isBlockingQrcItem(bloquante)).toBe(true);
    expect(isInTentativeScope(bloquante, "1")).toBe(true);

    const corrigee = qrc(2, 7, { reponseEleve: "Le livret de métrologie", corrigeManuel: true });
    expect(isBlockingQrcItem(corrigee)).toBe(false);
    expect(isInTentativeScope(corrigee, "1")).toBe(false);

    const vide = qrc(2, 7, { reponseEleve: "   ", corrigeManuel: false });
    expect(isBlockingQrcItem(vide)).toBe(false);
  });

  it("Toutes les tentatives conserve chaque passage", () => {
    expect(isInTentativeScope(qrc(1), "all")).toBe(true);
    expect(isInTentativeScope(qrc(3), "all")).toBe(true);
    expect(isInTentativeScope(qrc(undefined), "all")).toBe(true);
  });

  it("l'identité de rapprochement inclut passage, matière et question", () => {
    expect(getQrcQueueIdentity(qrc(1, 7))).not.toBe(getQrcQueueIdentity(qrc(2, 7)));
    expect(getQrcQueueIdentity(qrc(1, 7))).not.toBe(getQrcQueueIdentity(qrc(1, 8)));
  });
});

describe("Identité de passage — signature déterministe (jamais une fenêtre de temps)", () => {
  const yasinF = {
    reponses: {
      "1": "Le livret de métrologie",
      "2": "Transport d usager à titre honereux",
      "3": "2 mois",
      "4": "Calculé de totalité de la course",
    },
  };

  it("deux écritures du même passage (réponses strictement identiques) partagent la même signature", () => {
    const t1 = buildAnswerSignature({ ...yasinF });
    const t2 = buildAnswerSignature({ ...yasinF, questions: [{ questionId: 1, reponseEleve: "Le livret de métrologie" }] });
    const t3 = buildAnswerSignature({ ...yasinF, correctionsIA: { "1": { manuel: true } } });
    expect(t1).not.toBeNull();
    expect(t2).toBe(t1);
    expect(t3).toBe(t1);
  });

  it("une seule réponse différente = deux passages distincts, même à quelques secondes d'écart", () => {
    const autre = buildAnswerSignature({
      reponses: { ...yasinF.reponses, "3": "3 mois" },
    });
    expect(autre).not.toBe(buildAnswerSignature(yasinF));
  });

  it("aucune preuve certaine (pas de réponse rédigée) = pas de signature, donc jamais de fusion", () => {
    expect(buildAnswerSignature({ reponses: { "1": "A", "2": "B" } })).toBeNull();
    expect(buildAnswerSignature({ reponses: {} })).toBeNull();
    expect(buildAnswerSignature({ reponses: { "1": ".", "2": "." } })).toBeNull();
  });
});
