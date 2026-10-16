import { describe, it, expect } from "vitest";
import { parcoursAvecExemptionFormalites } from "@/lib/jalonsPedagogiques";

const THIERNO = "8313311b-3d05-4057-a8f8-3b4f7d64db46";
const parcours = [26, 2, 3, 4, 35, 5, 8, -2, 50];

describe("exemption fin de formation non attribuée (Thierno seul)", () => {
  it("Thierno sans 50 attribué : 50 retiré du parcours", () => {
    expect(parcoursAvecExemptionFormalites(THIERNO, parcours, [26, 2, 3, 4, 35, 5, 8])).not.toContain(50);
  });
  it("Thierno : pratique toujours exigée", () => {
    expect(parcoursAvecExemptionFormalites(THIERNO, parcours, [26, 2])).toContain(-2);
  });
  it("autre élève : 50 attribué ou non reste exigible", () => {
    expect(parcoursAvecExemptionFormalites("autre", parcours, [26, 2])).toContain(50);
    expect(parcoursAvecExemptionFormalites("autre", parcours, [26, 2, 50])).toContain(50);
  });
  it("Thierno avec 50 attribué : 50 redevient exigé", () => {
    expect(parcoursAvecExemptionFormalites(THIERNO, parcours, [2, 50])).toContain(50);
  });
  it("Ismail inchangé", () => {
    expect(parcoursAvecExemptionFormalites("c0844007-b999-4385-9665-918e5077c3b5", parcours, [])).toEqual(parcours);
  });
});
