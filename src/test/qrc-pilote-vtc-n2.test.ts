// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const lib = readFileSync("src/lib/qrcInstances.ts", "utf8");
const tab = readFileSync("src/components/cours-en-ligne/CorrectionQRCTab.tsx", "utf8");
const liste = readFileSync("src/components/cours-en-ligne/ExamenBlancsListe.tsx", "utf8");
const resultats = readFileSync("src/components/cours-en-ligne/ExamenBlancsResultats.tsx", "utf8");

describe("Pilote QRC — un seul vrai examen, jamais de mélange", () => {
  it("l'activation reste pilotée par la base, aucun examen codé en dur", () => {
    expect(lib).toContain("qrc_engine_flags");
    expect(lib).not.toMatch(/=\s*"EB2"/);
  });

  it("seuls les PASSAGES pris en charge par le moteur sortent de l'ancienne file", () => {
    expect(tab).toContain("fetchQrcEngineAttemptIds");
    expect(tab).toContain("engineAttemptIds.has(");
    // L'exclusion ne doit jamais porter sur l'examen entier (historique conservé).
    expect(tab).not.toContain("!isResultPlaceholder(r) && !engineQuizIds");
    expect(tab).toContain("!isResultPlaceholder(r) && !isHandledByEngine(r)");
  });

  it("le nouveau moteur ne peut que bloquer en plus, jamais débloquer l'historique", () => {
    expect(liste).toContain("enginePending === true");
    expect(liste).toContain("engineMatierePending === true");
    expect(resultats).toContain("engineExamPending === true");
  });

  it("le contrôle automatique coupe le drapeau sans rien supprimer", () => {
    expect(lib).toContain("qrc_pilot_integrity");
    expect(lib).toContain("qrc_disable_engine");
    const panel = readFileSync("src/components/cours-en-ligne/QrcInstancesPanel.tsx", "utf8");
    expect(panel).toContain("disableQrcEngine");
    expect(panel).toContain("🚨 ANOMALIE");
  });
});
