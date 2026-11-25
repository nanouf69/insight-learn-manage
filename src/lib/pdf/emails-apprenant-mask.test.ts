import { describe, it, expect } from "vitest";
import { maskPasswords } from "./emails-apprenant";
describe("maskPasswords", () => {
  it("masque une vraie valeur", () => expect(maskPasswords("Mot de passe : Abc123!")).toBe("Mot de passe : ••••••••"));
  it("garde le texte du mail d'identifiants lisible", () => expect(maskPasswords("Définissez votre mot de passe Adresse email : a@b.fr")).toBe("Définissez votre mot de passe Adresse email : a@b.fr"));
});
