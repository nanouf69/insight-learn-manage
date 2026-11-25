import { describe, expect, it, vi } from "vitest";
import {
  confirmerDateExamenTheorique,
  idsPratiquesEffectueesSignees,
  inscriptionPratiqueSignee,
} from "@/lib/candidatsFormationPreuves";

const IMAGE_SIGNEE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
const inscription = {
  apprenant_id: "candidat-1",
  presence_pratique: "present",
  sessions: { type_session: "pratique_vtc", date_debut: "2026-11-18", date_fin: "2026-11-18" },
};
const signature = {
  apprenant_id: "candidat-1",
  date_emargement: "2026-11-18",
  signature_data_url: IMAGE_SIGNEE,
  absent: false,
  masque: false,
};

describe("Pratique effectuée uniquement avec une signature", () => {
  it("une présence sans signature ne classe pas la pratique comme effectuée", () => {
    expect(inscriptionPratiqueSignee(inscription, [])).toBe(false);
  });

  it("une signature valide à la date de la session confirme la pratique", () => {
    expect(inscriptionPratiqueSignee(inscription, [signature])).toBe(true);
  });

  it("une signature à une autre date ou d'un autre candidat ne suffit pas", () => {
    expect(inscriptionPratiqueSignee(inscription, [{ ...signature, date_emargement: "2026-11-17" }])).toBe(false);
    expect(inscriptionPratiqueSignee(inscription, [{ ...signature, apprenant_id: "candidat-2" }])).toBe(false);
  });

  it("une absence, une feuille masquée ou une image vide ne suffit pas", () => {
    expect(inscriptionPratiqueSignee(inscription, [{ ...signature, absent: true }])).toBe(false);
    expect(inscriptionPratiqueSignee(inscription, [{ ...signature, masque: true }])).toBe(false);
    expect(inscriptionPratiqueSignee(inscription, [{ ...signature, signature_data_url: "" }])).toBe(false);
  });

  it("les identifiants confirmés sont uniques et les non-signés restent à former", () => {
    const autre = { ...inscription, apprenant_id: "candidat-2" };
    expect(idsPratiquesEffectueesSignees(
      [inscription, inscription, autre],
      [signature, { ...signature, apprenant_id: "candidat-2", signature_data_url: null }],
    )).toEqual(["candidat-1"]);
  });
});

describe("Date d'examen théorique confirmée par relecture", () => {
  it("enregistre exactement la date choisie", async () => {
    const ecrire = vi.fn().mockResolvedValue("17 novembre 2026");
    await expect(confirmerDateExamenTheorique("17 novembre 2026", ecrire)).resolves.toBe("17 novembre 2026");
    expect(ecrire).toHaveBeenCalledWith("17 novembre 2026");
  });

  it("refuse de confirmer si la relecture renvoie une autre valeur", async () => {
    await expect(confirmerDateExamenTheorique("17 novembre 2026", async () => "26 janvier 2027"))
      .rejects.toThrow("pas pu être confirmée");
  });

  it("refuse une date vide sans écrire", async () => {
    const ecrire = vi.fn();
    await expect(confirmerDateExamenTheorique("  ", ecrire)).rejects.toThrow("Choisissez une date");
    expect(ecrire).not.toHaveBeenCalled();
  });
});
