import { describe, it, expect } from "vitest";
import {
  appliquerSignatureEmail,
  signatureEmailHtml,
  SIGNATURE_EMAIL_COULEUR,
} from "../../supabase/functions/_shared/signatureEmail.ts";

/** Chaque mail sortant se termine par la signature bleue cursive FTRANSPORT Services Pro. */
describe("signatureEmail", () => {
  it("ajoute la signature à la fin d'un mail sans signature", () => {
    const out = appliquerSignatureEmail("<p>Bonjour,</p><p>Merci.</p>");
    expect(out.startsWith("<p>Bonjour,</p><p>Merci.</p>")).toBe(true);
    expect(out.endsWith(signatureEmailHtml())).toBe(true);
  });

  it("contient les mentions bleues en écriture cursive", () => {
    const out = appliquerSignatureEmail("<p>Test</p>");
    expect(out).toContain(SIGNATURE_EMAIL_COULEUR);
    expect(out).toContain("FTRANSPORT Services Pro");
    expect(out).toContain("86 route de Genas, 69003 Lyon");
    expect(out).toContain("04 28 29 60 91");
    expect(out).toContain("cursive");
  });

  it("remplace une signature existante « Cordialement + FTRANSPORT » au lieu de la doubler", () => {
    const mail =
      "<p>Bonjour,</p><p>Info.</p><p>Cordialement,<br><strong>L'équipe Ftransport</strong><br>86 Route de Genas, 69003 Lyon</p>";
    const out = appliquerSignatureEmail(mail);
    expect(out).toContain("Bonjour,");
    expect(out).not.toContain("L'équipe Ftransport");
    expect((out.match(/Cordialement/g) ?? []).length).toBe(1);
    expect(out.endsWith(signatureEmailHtml())).toBe(true);
  });

  it("appliquée deux fois, elle ne double jamais la signature", () => {
    const une = appliquerSignatureEmail("<p>Test</p>");
    const deux = appliquerSignatureEmail(une);
    expect((deux.match(/FTRANSPORT Services Pro/g) ?? []).length).toBe(1);
  });

  it("conserve la fermeture </body></html> après la signature", () => {
    const out = appliquerSignatureEmail(
      "<html><body><p>Contenu</p></body></html>",
    );
    expect(out).toMatch(/<\/body><\/html>$/);
    expect(out).toContain("FTRANSPORT Services Pro");
  });

  it("ne remplace pas un « Cordialement » suivi d'un contenu actif (lien) — la signature est ajoutée après", () => {
    const mail =
      "<p>Cordialement, consultez <a href=\"https://exemple.fr\">ce lien</a> pour continuer.</p>";
    const out = appliquerSignatureEmail(mail);
    expect(out).toContain("ce lien</a> pour continuer.");
    expect(out.endsWith(signatureEmailHtml())).toBe(true);
  });

  it("ne casse pas un corps vide ou non HTML", () => {
    expect(appliquerSignatureEmail("")).toBe("");
    const out = appliquerSignatureEmail("Texte simple sans balise");
    expect(out).toContain("FTRANSPORT Services Pro");
  });
});
