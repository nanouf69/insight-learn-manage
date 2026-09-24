/**
 * TESTS BLOQUANTS — Étape 1 sécurité des accès (24/09/2026).
 * Aucun nouveau mot de passe permanent ne doit se retrouver en clair dans
 * l'e-mail, l'historique des e-mails ou la fiche CRM.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  redactForHistory,
  setPasswordBlock,
  generateUnsharedPassword,
  SECRET_MASK,
  HISTORY_ACCESS_NOTE,
} from "../../supabase/functions/_shared/credential-secrets";

const F = (name: string) =>
  readFileSync(resolve(process.cwd(), "supabase/functions", name, "index.ts"), "utf8");

const SERVICES = ["create-apprenant-account", "resend-credentials", "auto-send-credentials"];

describe("Historique : aucun secret exploitable", () => {
  const link =
    "https://qywdsohyuigjmclemqgm.supabase.co/auth/v1/verify?token=abcdef123456&type=recovery&redirect_to=https://x/reset-password";

  it("le lien personnel est masqué, la trace d'envoi reste", () => {
    const html = `<p>Bonjour</p>${setPasswordBlock("eleve@test.fr", link)}`;
    const out = redactForHistory(html, [link]);
    expect(out).not.toContain("abcdef123456");
    expect(out).not.toContain("/auth/v1/verify");
    expect(out).toContain(SECRET_MASK);
    expect(out).toContain(HISTORY_ACCESS_NOTE);
    expect(out).toContain("eleve@test.fr");
  });

  it("le mot de passe temporaire est masqué", () => {
    const pwd = "Xk7pQ2mZ";
    const out = redactForHistory(`<code>${pwd}</code>`, [pwd]);
    expect(out).not.toContain(pwd);
  });

  it("filet de sécurité : lien non déclaré ou échappé HTML tout de même masqué", () => {
    const escaped = link.replace(/&/g, "&amp;");
    const out = redactForHistory(`<a href="${escaped}">x</a> ?token_hash=zzz999`, []);
    expect(out).not.toContain("abcdef123456");
    expect(out).not.toContain("zzz999");
  });

  it("le mot de passe interne est long et aléatoire", () => {
    const a = generateUnsharedPassword();
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(a).not.toBe(generateUnsharedPassword());
  });
});

describe("Les 3 services d'accès", () => {
  it.each(SERVICES)("%s : historique toujours masqué", (s) => {
    const src = F(s);
    expect(src).toContain("redactForHistory(");
    expect(src).not.toMatch(/body_html:\s*emailBody/);
  });

  it.each(SERVICES)("%s : n'écrit jamais le mot de passe dans le CRM", (s) => {
    expect(F(s)).not.toMatch(/mot_de_passe_plateforme/);
  });

  it.each(["create-apprenant-account", "auto-send-credentials"])(
    "%s : aucun mot de passe dans l'e-mail, lien sécurisé à la place",
    (s) => {
      const src = F(s);
      expect(src).not.toMatch(/Mot de passe\s*:<\/strong>/);
      expect(src).toContain("setPasswordBlock(");
      expect(src).toContain("generateSetPasswordLink(");
    },
  );

  it("création de compte : mot de passe ni renvoyé à l'écran ni modifié sur un compte existant", () => {
    const src = F("create-apprenant-account");
    expect(src).not.toMatch(/jsonResponse\(200,[\s\S]{0,80}password/);
    expect(src).not.toMatch(/Mot de passe : \$\{password\}/);
    expect(src).not.toMatch(/updateUserById\(existingUser\.id,\s*\{\s*password/);
  });

  it("envoi automatique : ne modifie jamais le mot de passe d'un compte existant", () => {
    expect(F("auto-send-credentials")).not.toMatch(/updateUserById\([^)]*password/);
  });
});
