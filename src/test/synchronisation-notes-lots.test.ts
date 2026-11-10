import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));
import { estTransitoire, LOT_ANCIEN, LOT_NOUVEAU, lireDiagnostic, VerificationAnnulee, type LigneDiagnostic } from "@/features/surveillance-examens/synchronisationNotes";

const ligne = (id: string): LigneDiagnostic => ({
  attempt_id: id, apprenant_id: "a", nom: "N", prenom: "P", exam_id: "EB3-TAXI", matiere: "t3p", titre: null, finished_at: null,
  type: "note_divergente", reparable: false, result_revision: 1, stocke: null, attendu: { status: "definitif", score: 12, qrc_restantes: 0 },
});
const page = (o: Record<string, unknown>) => ({ data: { terminees: 0, en_cours: 0, importees_sans_bareme: 0, lignes: [], lu_a: "t", ...o }, error: null });
const sansPause = { pause: async () => {} };

describe("Actualiser les notes — lecture par lots", () => {
  it("demande des lots de 50 (nouveau) et 200 (anciennes), reprend au curseur et contrôle le total", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce(page({ scannees: 50, terminees: 50, lignes: [ligne("a1")], suivant: "a50", fini: false, total: 70 }))
      .mockResolvedValueOnce(page({ scannees: 20, terminees: 20, lignes: [ligne("a60")], suivant: null, fini: true, total: 70 }))
      .mockResolvedValueOnce(page({ scannees: 3, lignes: [], suivant: null, fini: true, total: 3 }));
    const progres: string[] = [];
    const d = await lireDiagnostic(rpc, { ...sansPause, onProgress: (p) => progres.push(`${p.circuit}:${p.lues}/${p.total}`) });
    expect(rpc.mock.calls[0]).toEqual(["eb_notes_diagnostic", { p_apres: null, p_limite: LOT_NOUVEAU, p_attempt_id: null }]);
    expect(rpc.mock.calls[1][1]).toMatchObject({ p_apres: "a50" });
    expect(rpc.mock.calls[2]).toEqual(["eb_notes_diagnostic_ancien", { p_apres: null, p_limite: LOT_ANCIEN }]);
    expect(LOT_NOUVEAU).toBe(50);
    expect(progres).toEqual(["nouveau:50/70", "nouveau:70/70", "ancien:3/3"]);
    expect(d.couverture).toEqual({ nouveau: { lues: 70, total: 70 }, ancien: { lues: 3, total: 3 } });
    expect(d.lignes.map((l) => l.attempt_id)).toEqual(["a1", "a60"]);
  });

  it("lot interrompu par le budget serveur : la reprise continue au curseur rendu", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce(page({ scannees: 1, suivant: "a1", fini: false, interrompu_budget: true, total: 2 }))
      .mockResolvedValueOnce(page({ scannees: 1, suivant: null, fini: true, total: 2 }))
      .mockResolvedValueOnce(page({ scannees: 0, suivant: null, fini: true, total: 0 }));
    const d = await lireDiagnostic(rpc, sansPause);
    expect(rpc.mock.calls[1][1]).toMatchObject({ p_apres: "a1" });
    expect(d.couverture?.nouveau).toEqual({ lues: 2, total: 2 });
  });

  it("délai dépassé (57014) : le même lot est relu, sans doublon", async () => {
    const pause = vi.fn(async () => {});
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: "57014", message: "canceling statement due to statement timeout" } })
      .mockResolvedValueOnce(page({ scannees: 1, lignes: [ligne("a1")], suivant: null, fini: true, total: 1 }))
      .mockResolvedValueOnce(page({ scannees: 0, suivant: null, fini: true, total: 0 }));
    const d = await lireDiagnostic(rpc, { pause });
    expect(rpc.mock.calls[0][1]).toEqual(rpc.mock.calls[1][1]);
    expect(pause).toHaveBeenCalledWith(500);
    expect(d.lignes).toHaveLength(1);
  });

  it("délai dépassé à répétition : erreur détaillée (lot, circuit, code), aucun résultat partiel", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce(page({ scannees: 50, suivant: "a50", fini: false, total: 100 }))
      .mockResolvedValue({ data: null, error: { code: "57014", message: "canceling statement due to statement timeout" } });
    await expect(lireDiagnostic(rpc, sansPause)).rejects.toThrow(/Lot 2 \(nouveau correcteur, 50\/100 copies lues\).*statement timeout \[57014\] \(après 4 essais\)/);
    expect(rpc).toHaveBeenCalledTimes(5);
  });

  it("refus de droits : pas de nouvelle tentative", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "42501", message: "DIAGNOSTIC_NON_AUTORISE: administrateur requis." } });
    await expect(lireDiagnostic(rpc, sansPause)).rejects.toThrow(/administrateur requis\. \[42501\]$/);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("annulation : arrêt avant le lot suivant, erreur d'annulation", async () => {
    const ctrl = new AbortController();
    const rpc = vi.fn().mockImplementationOnce(async () => { ctrl.abort(); return page({ scannees: 50, suivant: "a50", fini: false, total: 100 }); });
    await expect(lireDiagnostic(rpc, { ...sansPause, signal: ctrl.signal })).rejects.toBeInstanceOf(VerificationAnnulee);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("une copie reçue deux fois interrompt la vérification", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce(page({ scannees: 50, lignes: [ligne("a1")], suivant: "a50", fini: false, total: 100 }))
      .mockResolvedValueOnce(page({ scannees: 50, lignes: [ligne("a1")], suivant: null, fini: true, total: 100 }));
    await expect(lireDiagnostic(rpc, sansPause)).rejects.toThrow(/reçue deux fois/);
  });

  it("curseur qui recule : vérification interrompue (jamais de boucle)", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce(page({ scannees: 1, suivant: "b", fini: false, total: 3 }))
      .mockResolvedValueOnce(page({ scannees: 1, suivant: "a", fini: false, total: 3 }));
    await expect(lireDiagnostic(rpc, sansPause)).rejects.toThrow(/curseur de reprise invalide/);
  });

  it("copies créées pendant la lecture : une relecture complète, puis erreur si toujours incomplet", async () => {
    const incomplet = page({ scannees: 9, suivant: null, fini: true, total: 10 });
    const rpc = vi.fn().mockResolvedValueOnce(incomplet).mockResolvedValueOnce(page({ scannees: 10, suivant: null, fini: true, total: 10 }))
      .mockResolvedValueOnce(page({ scannees: 0, suivant: null, fini: true, total: 0 }));
    const d = await lireDiagnostic(rpc, sansPause);
    expect(d.couverture?.nouveau).toEqual({ lues: 10, total: 10 });
    const rpc2 = vi.fn().mockResolvedValue(incomplet);
    await expect(lireDiagnostic(rpc2, sansPause)).rejects.toThrow(/Couverture incomplète \(nouveau correcteur\) : 9 copies lues sur 10/);
  });

  it("classe les erreurs transitoires", () => {
    expect(estTransitoire({ code: "57014" })).toBe(true);
    expect(estTransitoire({ message: "TypeError: Failed to fetch" })).toBe(true);
    expect(estTransitoire({ status: 503 })).toBe(true);
    expect(estTransitoire({ code: "42501", message: "administrateur requis" })).toBe(false);
    expect(estTransitoire({ code: "P0563", message: "NOTE_DIVERGENTE" })).toBe(false);
  });
});
