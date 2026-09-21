// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildQrcAttemptId } from "@/lib/qrcInstances";

describe("Moteur QRC — identifiant de passage définitif", () => {
  it("le même passage donne toujours le même identifiant (F5, reprise, renvoi)", () => {
    const a = buildQrcAttemptId("app-1", "EB-TEST-QRC", "gestion", 1);
    const b = buildQrcAttemptId("app-1", "EB-TEST-QRC", "gestion", 1);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("une nouvelle tentative, matière ou apprenant donne un identifiant différent", () => {
    const base = buildQrcAttemptId("app-1", "EB-TEST-QRC", "gestion", 1);
    expect(buildQrcAttemptId("app-1", "EB-TEST-QRC", "gestion", 2)).not.toBe(base);
    expect(buildQrcAttemptId("app-1", "EB-TEST-QRC", "francais", 1)).not.toBe(base);
    expect(buildQrcAttemptId("app-2", "EB-TEST-QRC", "gestion", 1)).not.toBe(base);
    expect(buildQrcAttemptId("app-1", "EB2", "gestion", 1)).not.toBe(base);
  });
});

describe("Moteur QRC — activation strictement par examen", () => {
  it("aucun examen n'est branché en dur dans le code", () => {
    const source = readFileSync("src/lib/qrcInstances.ts", "utf8");
    expect(source).toContain("qrc_engine_flags");
    expect(source).not.toMatch(/"EB\d/);
  });

  it("la file de correction historique ignore les examens branchés (jamais deux fois)", () => {
    const source = readFileSync("src/components/cours-en-ligne/CorrectionQRCTab.tsx", "utf8");
    expect(source).toContain("loadQrcEngineQuizIds");
    expect(source).toContain("!engineQuizIds.has(String(r.quiz_id))");
  });
});
