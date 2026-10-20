import { describe, it, expect } from "vitest";
import { docCourant, documentSelectionnable, aVersionCourante, type DocModele } from "@/components/examens/EnvoiEchecChoixPratiqueDialog";
import { MODELE_VERSION } from "@/lib/modeles/entrainementPratiqueVtc";

const candidat = { id: "fictif", nom: "TEST", prenom: "Fictif", date_examen_theorique: "2026-09-29" };
const document = (patch: Partial<DocModele> = {}): DocModele => ({
  id: "courant", apprenant_id: "fictif", cle_envoi: "examen_theorique:2026-09-29",
  modele_version: MODELE_VERSION, envoi_etat: "prepare", statut: "prepare",
  envoye_le: null, envoi_tente_le: null, envoi_erreur: null, choix: null,
  signe_le_paris: null, signed_at: null, texte_fige: null, texte_empreinte: null,
  reponses: {}, identite_figee: {}, mail_objet_fige: "Objet fictif", mail_html_fige: "<p>Fictif</p>", ...patch,
});

describe("Historique mail du même examen", () => {
  it("un mail v3 déjà envoyé n'empêche pas d'envoyer une fois la v4 préparée", () => {
    const ancien = document({ id: "envoye-v3", modele_version: "v3-2026-10-19", envoi_etat: "envoye", envoye_le: "2026-10-20T09:38:06Z" });
    expect(docCourant([document(), ancien], candidat)?.id).toBe("courant");
    expect(documentSelectionnable(docCourant([document(), ancien], candidat))).toBe(true);
    // Sans v4 préparée, l'ancien mail reste affiché et non sélectionnable.
    expect(docCourant([ancien], candidat)?.id).toBe("envoye-v3");
    expect(aVersionCourante([ancien], candidat)).toBe(false);
  });
  it("la v4 déjà envoyée ne peut pas repartir", () => {
    const v4 = document({ envoi_etat: "envoye", envoye_le: "2026-10-20T17:00:00Z" });
    expect(aVersionCourante([v4], candidat)).toBe(true);
    expect(documentSelectionnable(docCourant([v4], candidat))).toBe(false);
  });
  it("un autre examen et un autre candidat ne fournissent jamais l’aperçu", () => {
    expect(docCourant([document({ cle_envoi: "examen_theorique:2026-08-25" }), document({ apprenant_id: "autre" })], candidat)).toBeNull();
  });
  it("sélectionne uniquement le document actuel préparé, jamais envoyé ou signé", () => {
    expect(documentSelectionnable(document())).toBe(true);
    for (const patch of [{ envoi_etat: "envoye" }, { envoi_etat: "envoi_en_cours" }, { envoi_etat: "indetermine" }, { statut: "signe" }, { envoye_le: "2026-10-20T09:38:06Z" }, { modele_version: "v3-2026-10-19" }]) {
      expect(documentSelectionnable(document(patch))).toBe(false);
    }
  });
  it("l’envoi incertain ancien interdit de choisir un nouveau brouillon", () => {
    const incertain = document({ id: "incertain", modele_version: "v3-2026-10-19", envoi_etat: "indetermine" });
    expect(docCourant([document(), incertain], candidat)?.id).toBe("incertain");
    expect(documentSelectionnable(docCourant([document(), incertain], candidat))).toBe(false);
  });
});