import { describe, it, expect } from "vitest";
import { correctionOfficielleQrc } from "@/lib/correctionOfficielleQrc";

const core = { qrcProofs: [
  { questionId: "gestion:1", etat: "corrigee", note: 2 },
  { questionId: "gestion:2", etat: "corrigee", note: 0.5 },
  { questionId: "gestion:3", etat: "en_attente", note: null },
] };

describe("note QRC officielle prioritaire (cas BENNANI EB1 Gestion)", () => {
  it("2/2 du correcteur affiché 2/2, jamais 1/2 déterministe", () => {
    const c = correctionOfficielleQrc(core, "gestion", 1, 2)!;
    expect(c.pointsObtenus).toBe(2);
    expect(c.estCorrect).toBe(true);
  });
  it("note partielle conservée et comptée fausse", () => {
    const c = correctionOfficielleQrc(core, "gestion", "2", 2)!;
    expect(c.pointsObtenus).toBe(0.5);
    expect(c.estCorrect).toBe(false);
  });
  it("QRC en attente : aucune note officielle inventée", () => {
    expect(correctionOfficielleQrc(core, "gestion", 3, 2)).toBeNull();
  });
  it("autre matière même numéro : jamais confondue", () => {
    expect(correctionOfficielleQrc(core, "t3p", 1, 2)).toBeNull();
  });
  it("passage sans preuve V2 : repli historique", () => {
    expect(correctionOfficielleQrc(null, "gestion", 1, 2)).toBeNull();
  });
});
