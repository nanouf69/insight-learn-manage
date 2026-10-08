// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { estEmailValide } from "../../supabase/functions/_shared/email-valide";
import { deciderReutilisation } from "../../supabase/functions/_shared/compte-existant";

describe("Audit 08/10 — corrections", () => {
  it("adresses invalides ignorées, valides acceptées", () => {
    expect(estEmailValide("rrt")).toBe(false);
    expect(estEmailValide("a b@x.fr")).toBe(false);
    expect(estEmailValide("")).toBe(false);
    expect(estEmailValide("eleve@exemple.fr")).toBe(true);
    expect(estEmailValide(" Eleve.Test+1@Exemple.COM ")).toBe(true);
  });

  it("réinscription bloquée = ignorée (pas un échec), jamais rattachée", () => {
    const d = deciderReutilisation({ id: "u1", email: "x@y.fr" }, "nouveau", [{ id: "ancien", created_at: "2026-02-01" }]);
    expect(d.action).toBe("bloquer");
    if (d.action === "bloquer") expect(d.raison.startsWith("Réinscription")).toBe(true);
    const src = readFileSync("supabase/functions/auto-send-credentials/index.ts", "utf8");
    expect(src).toContain('ignore: decision.raison.startsWith("Réinscription")');
    expect(src).toContain("!r.success && !r.ignore");
  });

  it("SMS automatiques : jeton de service transmis et accepté", () => {
    expect(readFileSync("supabase/functions/auto-send-pratique-booking/index.ts", "utf8")).toContain("Authorization: `Bearer ${srk}`");
    expect(readFileSync("supabase/functions/send-sms-ovh/index.ts", "utf8")).toContain("apikeyHeader === serviceKey");
  });

  it("contrôle de présence et tableaux bancaires : aucun appel sans session", () => {
    for (const f of ["src/hooks/usePresenceCheck.ts", "src/components/dashboard/SmallTransfersTable.tsx", "src/components/dashboard/PersonalFinancingTransfersTable.tsx"]) {
      expect(readFileSync(f, "utf8")).toContain("supabase.auth.getSession()");
    }
  });
});
