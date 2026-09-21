// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_ENTREPRISE, DEFAULT_TEMPLATES, renderEmail, renderTemplate, textToHtml, htmlToText } from "@/lib/prestataires/templates";

const dossier = {
  prestataire_nom: "DUPONT",
  prestataire_prenom: "Jean",
  raison_sociale: "TEST SERVICES",
  description_prestation: "Nettoyage des locaux",
  date_prestation: "2026-08-12",
  date_paiement: "2026-08-20",
  montant_paye: 1200,
  mode_paiement: "virement",
  reference_paiement: "VIR-8821",
};

describe("Modèles d'e-mails prestataires", () => {
  it("remplace les variables par les informations du dossier", () => {
    const { objet, corps } = renderEmail(
      DEFAULT_TEMPLATES.demande,
      DEFAULT_TEMPLATES.signature.corps,
      dossier,
      { ...DEFAULT_ENTREPRISE, siren: "123456789", responsable: "N. GUENICHI" },
    );
    expect(objet).toContain("Nettoyage des locaux");
    expect(objet).toContain("12/08/2026");
    expect(corps).toContain("Bonjour Jean DUPONT,");
    expect(corps).toContain("Virement");
    expect(corps).toContain("VIR-8821");
    expect(corps).toContain("1 200,00 €");
    expect(corps).not.toContain("{{");
  });

  it("supprime proprement les lignes dont l'information est absente", () => {
    const { corps } = renderEmail(
      DEFAULT_TEMPLATES.demande,
      DEFAULT_TEMPLATES.signature.corps,
      { ...dossier, reference_paiement: null, mode_paiement: null },
      DEFAULT_ENTREPRISE,
    );
    expect(corps).not.toContain("Référence du règlement");
    expect(corps).not.toContain("Mode de règlement");
    expect(corps).not.toContain("NON RENSEIGNÉ");
    expect(corps).not.toMatch(/\n\s*\n\s*\n/);
  });

  it("conserve le texte exact entre la génération et l'archivage HTML", () => {
    const texte = renderTemplate("Bonjour {{prestataire_nom}},\nMerci.", { prestataire_nom: "Jean" });
    expect(htmlToText(textToHtml(texte))).toContain("Bonjour Jean,");
    expect(htmlToText(textToHtml(texte))).toContain("Merci.");
  });
});
