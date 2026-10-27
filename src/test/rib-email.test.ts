import { describe, it, expect } from "vitest";
import { buildRibEmailHtml, RIB_EMAIL_SUBJECT } from "@/lib/ribEmail";
import { RIB_INFO } from "@/lib/pdf/devis-canonical";

describe("Mail RIB de la société (Revolut)", () => {
  it("contient exactement le RIB canonique de la société", () => {
    const html = buildRibEmailHtml("Jean Dupont");
    expect(html).toContain(RIB_INFO.titulaire);
    expect(html).toContain(RIB_INFO.iban);
    expect(html).toContain(RIB_INFO.swift);
    expect(html).toContain(RIB_INFO.banque);
    expect(html).toContain(RIB_INFO.adresse);
  });

  it("salue l'apprenant et reste utilisable sans nom", () => {
    expect(buildRibEmailHtml("Jean Dupont")).toContain("Bonjour Jean Dupont,");
    expect(buildRibEmailHtml("")).toContain("Bonjour,");
    expect(buildRibEmailHtml(undefined)).toContain("Bonjour,");
  });

  it("garde un objet de mail identifiable pour l'indicateur « déjà envoyé »", () => {
    // L'indicateur SessionDetail détecte « rib » dans l'objet normalisé.
    expect(RIB_EMAIL_SUBJECT.toLowerCase()).toContain("rib");
  });
});
