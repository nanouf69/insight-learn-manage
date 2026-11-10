import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));
import { actualiserCopie, compterParType, lireDiagnostic, remplacerLigne, signalerCorrectionEnregistree, EVENEMENT_NOTES_CORRIGEES, type LigneDiagnostic } from "@/features/surveillance-examens/synchronisationNotes";

const ligne = (id: string, type: LigneDiagnostic["type"], reparable = false): LigneDiagnostic => ({
  attempt_id: id, apprenant_id: "a", nom: "N", prenom: "P", exam_id: "EB3-TAXI", matiere: "t3p", titre: null, finished_at: null,
  type, reparable, result_revision: 3, stocke: null, attendu: { status: "definitif", score: 12, qrc_restantes: 0 },
});

describe("Actualiser les notes", () => {
  it("lit toutes les pages des deux circuits dans l'ordre", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { terminees: 2, en_cours: 1, importees_sans_bareme: 0, lignes: [ligne("1", "attente_fantome", true)], suivant: "1", lu_a: "t" }, error: null })
      .mockResolvedValueOnce({ data: { terminees: 1, en_cours: 0, importees_sans_bareme: 1, lignes: [ligne("2", "qrc_non_corrigee")], suivant: null, lu_a: "t2" }, error: null })
      .mockResolvedValueOnce({ data: { lignes: [{ result_id: "r", type: "ancienne_copie_sans_correction" }], suivant: null }, error: null });
    const d = await lireDiagnostic(rpc);
    expect(rpc.mock.calls[1][1]).toMatchObject({ p_apres: "1" });
    expect([d.terminees, d.enCours, d.importeesSansBareme, d.lignes.length, d.anciennes.length]).toEqual([3, 1, 1, 2, 1]);
  });

  it("une erreur de lecture est une erreur, jamais un résultat partiel", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { terminees: 1, lignes: [], suivant: "x" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "timeout" } });
    await expect(lireDiagnostic(rpc)).rejects.toThrow("timeout");
  });

  it("refuse d'actualiser une copie à vérification humaine sans appeler le serveur", async () => {
    const rpc = vi.fn();
    await expect(actualiserCopie("op", ligne("1", "note_divergente"), rpc)).rejects.toThrow(/vérification humaine/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("envoie la version lue (CAS) et l'opération fournie", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { statut: "actualise", result_revision: 4, status: "definitif", score: 12, qrc_restantes: 0 }, error: null });
    await actualiserCopie("op-1", ligne("1", "attente_fantome", true), rpc);
    expect(rpc).toHaveBeenCalledWith("eb_notes_actualiser", { p_operation_id: "op-1", p_attempt_id: "1", p_revision_attendue: 3 });
  });

  it("relecture : une copie redevenue cohérente disparaît, une autre est remplacée", () => {
    const l = [ligne("1", "attente_fantome", true), ligne("2", "qrc_non_corrigee")];
    expect(remplacerLigne(l, "1", null).map((x) => x.attempt_id)).toEqual(["2"]);
    expect(compterParType(remplacerLigne(l, "2", ligne("2", "attente_fantome", true))).attente_fantome).toBe(2);
  });

  it("signale chaque correction enregistrée avec l'identité de la copie", () => {
    const vu: string[] = [];
    const f = (e: Event) => vu.push((e as CustomEvent).detail.attemptId);
    window.addEventListener(EVENEMENT_NOTES_CORRIGEES, f);
    signalerCorrectionEnregistree("att-9");
    signalerCorrectionEnregistree(undefined);
    window.removeEventListener(EVENEMENT_NOTES_CORRIGEES, f);
    expect(vu).toEqual(["att-9"]);
  });
});
