import { describe, expect, it, vi } from "vitest";

const notifier = vi.fn();
vi.mock("@/lib/chunkVersionGuard", () => ({ notifierChunkObsolete: () => notifier() }));

import { installDeployedVersionWatch, scriptPrincipal, versionDifferente } from "@/lib/deployedVersionWatch";

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
  it("affiche la notification « Recharger » sans recharger tout seul quand une nouvelle version est en ligne", async () => {
    const s = document.createElement("script");
    s.type = "module"; s.src = "/assets/index-ANCIENNE.js";
    document.head.appendChild(s);
    const reload = vi.spyOn(window.location, "reload").mockImplementation(() => {});
    const fetcher = vi.fn(async () => new Response(page("NOUVELLE"), { status: 200 }));
    installDeployedVersionWatch(window, fetcher as any);
    await vi.waitFor(() => expect(notifier).toHaveBeenCalledTimes(1));
    expect(fetcher.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
    window.dispatchEvent(new Event("focus"));
    await new Promise((r) => setTimeout(r, 10));
    expect(notifier).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });
});
