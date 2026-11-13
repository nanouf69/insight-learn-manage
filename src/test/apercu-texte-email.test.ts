import { describe, it, expect } from "vitest";
import { apercuTexteEmail } from "@/lib/apercuTexteEmail";

describe("apercuTexteEmail", () => {
  it("aperçu tronqué sur une balise ouverte → vide, jamais de code brut", () => {
    expect(apercuTexteEmail('<div style="font-family:Arial,Helvetica,sans-serif;max-width')).toBe("");
  });
  it("garde le texte lisible et décode les entités", () => {
    expect(apercuTexteEmail("<p>Bonjour Elvis Lucevic,</p>\n<p>Nous avons le plaisir&nbsp;de vo"))
      .toBe("Bonjour Elvis Lucevic, Nous avons le plaisir de vo");
  });
  it("texte brut inchangé", () => {
    expect(apercuTexteEmail("Bonjour, a < b")).toBe("Bonjour, a < b");
  });
  it("retire les styles", () => {
    expect(apercuTexteEmail("<style>p{color:red}</style><b>Convocation</b>")).toBe("Convocation");
  });
});
