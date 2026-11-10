import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));
import { supabase } from "@/integrations/supabase/client";
import { memesReponsesRemise, provenanceRemise, verifierLiaisonHistoriqueServeur, type ResultatEb2 } from "@/features/correction-qrc-v2/eb2Consultation";
const row: ResultatEb2 = { id: "r", apprenant_id: "a", quiz_id: "EB2", matiere_id: "gestion", tentative: 1, completed_at: "2026-11-09T18:00:01Z", details: {
  snapshot: { questions: [{ id: 1, type: "QRC" }, { id: 18, type: "QCM" }] }, reponses: { 1: "−10 € : pas autorisé", 18: ["A", "B"] },
} };
const proof = { apprenant_id: "a", exercice_id: "EB2__gestion", tentative: 1, completed: true, status: "submitted", submitted_at: "2026-11-09T18:00:00Z", reponses: { 1: "−10 € : pas autorisé", 18: ["B", "A"] } };
describe("preuve de remise QRC et permutation des cases QCM", () => {
  it("mêmes choix A+B/B+A, QRC exacte : remise prouvée sans changer les données", () => {
    const original = structuredClone(row);
    expect(memesReponsesRemise(row, proof.reponses)).toBe(true);
    expect(provenanceRemise(row, [proof])).toBe("remise_horodatage_divergent");
    expect(row).toEqual(original);
  });
  it.each(["10 € : pas autorisé", "−10 € : autorisé", "−10 euros : pas autorisé", "−10 € : pas autorisé "])("texte QRC différent refusé : %s", answer => {
    expect(memesReponsesRemise(row, { ...proof.reponses, 1: answer })).toBe(false);
  });
  it.each([["A", "C"], ["A", "B", "B"], ["A", "Z"], ["a", "b"]])("choix différents ou invalides refusés %j", (...choices) => {
    expect(memesReponsesRemise(row, { ...proof.reponses, 18: choices })).toBe(false);
  });
  it("autre élève, matière, tentative ou brouillon ne prouvent jamais cette copie", () => {
    for (const change of [{ apprenant_id: "b" }, { exercice_id: "EB2__t3p" }, { tentative: 2 }, { status: "draft" }, { completed: false }]) {
      expect(provenanceRemise(row, [{ ...proof, ...change }])).toBe("resultat_seul");
    }
  });
  it("clé absente/ajoutée et permutation dans une QRC refusées", () => {
    expect(memesReponsesRemise(row, { 18: ["B", "A"] })).toBe(false);
    expect(memesReponsesRemise(row, { ...proof.reponses, 2: "extra" })).toBe(false);
    const qrc = { ...row, details: { ...row.details, snapshot: { questions: [{ id: 18, type: "QRC" }] } } };
    expect(memesReponsesRemise(qrc, proof.reponses)).toBe(false);
  });
  it("contrôle serveur absent/refusé : aucun contournement par reconnaissance", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } } as any);
    await expect(verifierLiaisonHistoriqueServeur("r", "a")).rejects.toThrow(/réparation serveur/);
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { result_id: "r", apprenant_id: "b", provenance: "remise_identique" }, error: null } as any);
    await expect(verifierLiaisonHistoriqueServeur("r", "a")).rejects.toThrow(/non prouvée/);
  });
  it("preuve serveur même copie et propriétaire acceptée", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { result_id: "r", apprenant_id: "a", provenance: "remise_horodatage_divergent" }, error: null } as any);
    expect(await verifierLiaisonHistoriqueServeur("r", "a")).toBe("remise_horodatage_divergent");
  });
});