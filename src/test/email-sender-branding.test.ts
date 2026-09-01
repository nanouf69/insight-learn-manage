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

  it("affiche toujours le mot de passe dans le renvoi des identifiants", () => {
    const source = readFileSync(resolve(FUNCTIONS_ROOT, "resend-credentials/index.ts"), "utf8");
    expect(source).toContain("${credentialPassword}");
    expect(source).not.toContain("<strong>Mot de passe :</strong> inchangé");
    expect(source).not.toContain("Utilisez votre mot de passe habituel");
  });
});