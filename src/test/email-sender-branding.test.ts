// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FUNCTIONS_ROOT = resolve(process.cwd(), "supabase/functions");
const OUTBOUND_FUNCTIONS = [
  "sync-outlook-emails",
  "create-apprenant-account",
  "auto-send-credentials",
  "resend-credentials",
  "resend-emails-to-new-address",
  "send-document-email",
  "auto-send-pratique-booking",
  "relance-50pct-1mois-avant-examen",
  "relance-emargements-manquants",
  "relance-examens-proches",
  "relance-inactifs",
  "relance-non-connectes",
  "relance-signatures-fin-session",
  "relance-suspension-cpf",
];

describe("Identité d'expéditeur FTRANSPORT", () => {
  it("centralise tous les envois sur le transport de marque", () => {
    for (const functionName of OUTBOUND_FUNCTIONS) {
      const source = readFileSync(resolve(FUNCTIONS_ROOT, functionName, "index.ts"), "utf8");
      expect(source, functionName).toContain("sendBrandedEmail");
      expect(source, functionName).not.toMatch(/graph\.microsoft\.com\/.*\/sendMail/);
    }
  });

  it("verrouille le nom et l'adresse visibles de l'expéditeur", () => {
    const helper = readFileSync(resolve(FUNCTIONS_ROOT, "_shared/send-branded-email.ts"), "utf8");
    expect(helper).toContain('const FROM_ADDRESS = "FTRANSPORT <contact@ftransport.fr>"');
  });

  describe("renvoi des identifiants (lien sécurisé / mot de passe temporaire)", () => {
    const source = readFileSync(resolve(FUNCTIONS_ROOT, "resend-credentials/index.ts"), "utf8");
    const accessBlock = source.slice(source.indexOf("const accessBlock"), source.indexOf("const emailBody"));
    const [blocTemp, blocLien] = accessBlock.split(/\n\s*:\s*`/);

    it("lien sécurisé : contient le lien personnel et aucun mot de passe", () => {
      expect(source).toContain('type: "recovery"');
      expect(blocLien).toContain("${resetLink}");
      expect(blocLien).not.toMatch(/Password\}|mot de passe temporaire :/i);
    });

    it("mot de passe temporaire : uniquement celui qui vient d'être généré et appliqué au compte", () => {
      expect(source).toMatch(/crypto\.getRandomValues/);
      expect(source).toMatch(/updateUserById\(\s*apprenant\.auth_user_id,\s*\{ password: generated \}/);
      expect(source).toContain("tempPassword = generated;");
      expect(blocTemp).toContain("${tempPassword}");
      expect(blocTemp).not.toContain("${resetLink}");
    });

    it("aucun mot de passe enregistré dans la fiche apprenant n'est lu ni envoyé", () => {
      expect(source).not.toMatch(/apprenant\??\.\w*(pass|mdp|pwd)\w*/i);
      expect(source).not.toContain("${credentialPassword}");
      expect(source).not.toContain("Utilisez votre mot de passe habituel");
    });

    it("refuse tout appelant non administrateur avant toute action", () => {
      const adminCheck = source.indexOf('_role: "admin"');
      expect(source).toContain('"Réservé aux administrateurs"');
      expect(source).toMatch(/if \(!isAdmin\)[\s\S]{0,120}status: 403/);
      expect(adminCheck).toBeGreaterThan(0);
      expect(adminCheck).toBeLessThan(source.indexOf("updateUserById"));
      expect(adminCheck).toBeLessThan(source.indexOf("generateLink"));
    });
  });
});
