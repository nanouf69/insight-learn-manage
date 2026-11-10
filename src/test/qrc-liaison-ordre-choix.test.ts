import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));
import { supabase } from "@/integrations/supabase/client";
import { memesReponsesRemise, provenanceRemise, reconnaissanceRemise, verifierLiaisonHistoriqueServeur, type ResultatEb2 } from "@/features/correction-qrc-v2/eb2Consultation";
import { projeterResultatEb2, projeterNoteHistoriqueEb2 } from "@/features/correction-qrc-v2/eb2Consultation";
import { computeMoyenneExamen, computeMatiereScoreForAttempt } from "@/components/cours-en-ligne/examens-blancs-scoring";
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
  it("copie relue après notation 1/2 : correction, matière et global suivent les preuves enregistrées", () => {
    const corrected = { ...row, score_obtenu: 11, score_max: 20, note_sur_20: 11, reussi: true,
      details: { ...row.details, correctionsIA: { 1: { pointsObtenus: 1, validatedByAdmin: true, manuel: true } } } };
    const reload = JSON.parse(JSON.stringify(corrected));
    const projected = projeterResultatEb2(reload, "Fictif", true);
    expect(projected.qrc[0]).toMatchObject({ etat: "corrigee", note: 1 });
    expect(projeterNoteHistoriqueEb2(reload, projected.qrc)).toMatchObject({ status: "definitif", score: 11 });
    const mats = Array.from({ length: 7 }, (_, i) => ({ id: `m${i}`, nom: `M${i}`, coefficient: 1, noteEliminatoire: 6, noteSur: 20, questions: [] }));
    const exam = { id: "EB2", type: "VTC", matieres: mats } as any;
    const result = computeMoyenneExamen(exam, m => computeMatiereScoreForAttempt(m, reload));
    expect(result).toMatchObject({ moyenne: 11, matieresPassees: 7, verdict: "reussi" });
  });
});
describe("copies suffixées __tN avec colonne tentative restée à 1 (cas Meriem BENNANI EB2 T3)", () => {
  const t3: ResultatEb2 = { ...row, id: "r3", tentative: 3 };
  const remise = { ...proof, exercice_id: "EB2__gestion__t3", tentative: 1 };
  it("reconnue seulement comme « à prouver » : le serveur doit répondre liaison_prouvee", () => {
    expect(provenanceRemise(t3, [remise])).toBe("liaison_a_prouver");
    expect(() => reconnaissanceRemise("liaison_a_prouver", "r3", "1")).toThrow(/aucune note/);
    expect(reconnaissanceRemise("liaison_prouvee", "r3", "1")).toMatch(/preuve serveur de liaison/);
  });
  it("aucune tolérance hors du motif exact", () => {
    for (const change of [{ exercice_id: "EB2__gestion" }, { exercice_id: "EB2__gestion__t2" }, { tentative: 2 }, { apprenant_id: "b" }, { status: "draft" }, { reponses: { ...proof.reponses, 1: "autre" } }]) {
      expect(provenanceRemise(t3, [{ ...remise, ...change }])).toBe("resultat_seul");
    }
    expect(provenanceRemise(t3, [remise, { ...remise, submitted_at: "2026-11-09T18:00:05Z" }])).toBe("resultat_seul");
    expect(provenanceRemise({ ...t3, tentative: 1 }, [{ ...remise, exercice_id: "EB2__gestion" , reponses: { 1: "x" } }])).toBe("resultat_seul");
  });
  it("le serveur seul peut accepter liaison_prouvee, pour la même copie et le même élève", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { result_id: "r3", apprenant_id: "a", provenance: "liaison_prouvee" }, error: null } as any);
    await expect(verifierLiaisonHistoriqueServeur("r3", "a")).resolves.toBe("liaison_prouvee");
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { result_id: "r3", apprenant_id: "a", provenance: "liaison_a_prouver" }, error: null } as any);
    await expect(verifierLiaisonHistoriqueServeur("r3", "a")).rejects.toThrow(/non prouvée/);
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { result_id: "autre", apprenant_id: "a", provenance: "liaison_prouvee" }, error: null } as any);
    await expect(verifierLiaisonHistoriqueServeur("r3", "a")).rejects.toThrow(/non prouvée/);
  });
});
