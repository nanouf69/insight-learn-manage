import { describe, it, expect } from "vitest";
import { generateReleveConnexionsPdf } from "@/lib/pdf/releve-connexions";

describe("releve journees presentiel", () => {
  it("renders dates", async () => {
    const res = generateReleveConnexionsPdf({ nom: "X", prenom: "Y" }, [] as any, {
      returnBlob: true,
      journeesPresentiel: [{ date: "2026-06-16", label: "pratique" }],
      heuresPrevuesElearning: 60, heuresPrevuesPresentiel: 6, heuresPrevuesTotal: 66,
      heuresFaitesElearning: 60, heuresFaitesPresentiel: 6,
    } as any) as any;
    const txt = await res.blob.text();
    expect(res?.blob).toBeTruthy();
    console.log("HAS_16_06:", txt.includes("16/06/2026"), "len", txt.length);
  });
});
