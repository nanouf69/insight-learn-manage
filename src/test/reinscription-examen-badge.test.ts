import { describe, it, expect } from "vitest";
import { statutReinscription } from "@/components/examens/ReinscriptionExamenBadge";
import type { DocChoixRow } from "@/lib/choixPratiqueEtat";

const doc: DocChoixRow = { id: "fictif", token: null, statut: "signe", choix: "maintenant", reinscription_examen: "oui",
  texte_fige: JSON.stringify({ reinscription: {} }), signed_at: "2026-10-20T10:00:00Z", signe_le_paris: null, envoye_le: null };

describe("Réinscription déclarée uniquement", () => {
  it("ancien mail sans question reste inconnu, même avec un choix pratique", () => {
    expect(statutReinscription({ ...doc, texte_fige: "{}" }, [])).toBe("inconnu");
    expect(statutReinscription(null, [])).toBe("inconnu");
  });
  it("document non signé reste en attente sans déduire oui", () => {
    expect(statutReinscription({ ...doc, statut: "envoye" }, [])).toBe("attente");
  });
  it("dernière révision du même document prime et les autres sont ignorées", () => {
    expect(statutReinscription(doc, [
      { document_id: "fictif", choix: "plus_tard", reinscription_examen: "non", signe_le: "2026-10-21T10:00:00Z", signe_le_paris: null },
      { document_id: "autre", choix: "maintenant", reinscription_examen: "oui", signe_le: "2026-10-22T10:00:00Z", signe_le_paris: null },
    ])).toBe("non");
    expect(statutReinscription(doc, [])).toBe("oui");
  });
});