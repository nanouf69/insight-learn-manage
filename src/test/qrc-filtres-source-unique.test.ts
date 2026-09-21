// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getQrcQueueIdentity, isInTentativeScope } from "@/components/cours-en-ligne/CorrectionQRCTab";

const qrc = (tentative: number | undefined, questionId = 7) => ({
  apprenantId: "A1",
  quizId: "EB2",
  passageKey: `A1__examen_blanc__EB2__gestion__T${tentative ?? "inconnue"}`,
  matiereId: "gestion",
  questionId,
  dbTentative: tentative,
});

describe("Correction QRC — périmètre unique des compteurs et listes", () => {
  it("Tentative 1 exclut les tentatives 2+ et les passages non attribués", () => {
    expect(isInTentativeScope(qrc(1), "1")).toBe(true);
    expect(isInTentativeScope(qrc(2), "1")).toBe(false);
    expect(isInTentativeScope(qrc(undefined), "1")).toBe(false);
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