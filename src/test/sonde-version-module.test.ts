import { describe, expect, it } from "vitest";
import { SONDE_VERSION_ADMIN_MS, SONDE_VERSION_ELEVE_MS } from "@/lib/moduleLiveRefresh";

describe("sonde de secours des modules (charge base 04/11)", () => {
  it("élève : une sonde toutes les 30 s, plus toutes les 5 s", () => {
    expect(SONDE_VERSION_ELEVE_MS).toBe(30_000);
  });
  it("admin : intervalle inchangé à 15 s", () => {
    expect(SONDE_VERSION_ADMIN_MS).toBe(15_000);
  });
});
