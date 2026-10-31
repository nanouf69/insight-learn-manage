import { describe, expect, it } from "vitest";
import { scriptPrincipal, versionDifferente } from "@/lib/deployedVersionWatch";

const page = (h: string) => `<html><head><script type="module" crossorigin src="/assets/index-${h}.js"></script></head></html>`;

describe("onglet resté sur une ancienne version", () => {
  it("lit le script principal de la page publiée", () => {
    expect(scriptPrincipal(page("sOJdqsha"))).toBe("/assets/index-sOJdqsha.js");
    expect(scriptPrincipal("<html>maintenance</html>")).toBeNull();
  });
  it("signale seulement une version publiée différente et connue", () => {
    expect(versionDifferente("/assets/index-A.js", scriptPrincipal(page("B")))).toBe(true);
    expect(versionDifferente("/assets/index-A.js", scriptPrincipal(page("A")))).toBe(false);
    expect(versionDifferente("/assets/index-A.js", null)).toBe(false);
    expect(versionDifferente(null, "/assets/index-B.js")).toBe(false);
  });
});
