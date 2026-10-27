/** Règle 27/10 : la modification du mot de passe ne demande jamais l'ancien. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const login = read("src/components/cours-en-ligne/StudentLogin.tsx");

describe("Modification du mot de passe sans ancien mot de passe", () => {
  it("l'écran élève ne demande jamais le mot de passe actuel", () => {
    expect(login).not.toContain("Mot de passe actuel");
    expect(login).not.toContain("ancien mot de passe");
  });

  it("passe par un lien sécurisé envoyé par email, jamais par une connexion avec l'ancien", () => {
    expect(login).toContain("resetPasswordForEmail");
    const blocChangement = login.slice(login.indexOf("handleChangePassword"), login.indexOf("handleForgotPassword"));
    expect(blocChangement).not.toContain("signInWithPassword");
  });
});
