import { afterEach, describe, expect, it, vi } from "vitest";
import { alertesPourIndicateur, DEFAULT_ETAT, type QualiopiPreuve } from "./data";

const certificat = {
  id: "certificat-test",
  titre: "CERTIFOPAC 98912-3",
  description: null,
  ce_que_demontre: "NDA 84380722238",
  emplacement: null,
  remarque_interne: null,
  source_libelle: null,
  date_preuve: "2026-11-25",
  valide_du: "2025-03-22",
  valide_au: "2028-03-21",
  fichiers: [],
  lien_url: null,
  source_type: "certificat_original",
  source_table: "formateurs",
  source_id: "formateur-test",
  archivee: false,
  archivee_le: null,
  created_at: "2026-11-25T00:00:00Z",
  indicateurs: [27],
} satisfies QualiopiPreuve;

afterEach(() => vi.useRealTimers());

describe("rappel d’expiration des preuves Qualiopi", () => {
  it("signale le certificat à J-90, soit le 22/12/2027", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-12-22T12:00:00Z"));
    expect(alertesPourIndicateur({ ...DEFAULT_ETAT(27), statut: "a_completer" }, [certificat])).toContain("preuve_expiration_proche");
  });

  it("ne signale pas l’échéance à J-91", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-12-21T12:00:00Z"));
    expect(alertesPourIndicateur({ ...DEFAULT_ETAT(27), statut: "a_completer" }, [certificat])).not.toContain("preuve_expiration_proche");
  });

  it("remplace le rappel par l’alerte expirée après le 21/03/2028", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2028-03-22T12:00:00Z"));
    const alertes = alertesPourIndicateur({ ...DEFAULT_ETAT(27), statut: "a_completer" }, [certificat]);
    expect(alertes).toContain("preuve_expiree");
    expect(alertes).not.toContain("preuve_expiration_proche");
  });
});
