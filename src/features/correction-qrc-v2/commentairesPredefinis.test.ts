import { describe, expect, it } from "vitest";
import { ajouterCommentaireQrc } from "./commentairesPredefinis";

describe("Commentaires pédagogiques cumulatifs", () => {
  it("conserve intégralement le commentaire libre existant", () => {
    expect(ajouterCommentaireQrc("Votre réponse :\nà développer. ", "Précisez !!!"))
      .toBe("Votre réponse :\nà développer. \nPrécisez !!!");
  });
  it("cumule les commentaires distincts", () => {
    expect(ajouterCommentaireQrc(ajouterCommentaireQrc("", "Précisez !!!"), "Mal dit !!!"))
      .toBe("Précisez !!!\nMal dit !!!");
  });
  it("ignore un double clic même après une modification libre", () => {
    expect(ajouterCommentaireQrc("Réponse imprécise. Précisez !!! Merci.", "Précisez !!!"))
      .toBe("Réponse imprécise. Précisez !!! Merci.");
  });
});