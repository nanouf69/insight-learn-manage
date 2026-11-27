import { describe, it, expect, vi } from "vitest";
import { planDestinatairesDevis, envoyerDevisAuxDestinataires, type JournalDevis, type Destinataire } from "@/lib/devisDestinataires";

function journalMemoire(init: Record<string, "envoye" | "echec" | "en_cours"> = {}): JournalDevis & { etat: Record<string, string> } {
  const etat: Record<string, string> = { ...init };
  return {
    etat,
    async reserver(d) {
      const s = etat[d.email];
      if (s === "envoye" || s === "en_cours") return { ok: false, statut: s };
      etat[d.email] = "en_cours"; return { ok: true };
    },
    async marquer(d, s) { etat[d.email] = s; },
  };
}

describe("plan destinataires devis", () => {
  it("financement tiers : stagiaire + financeur", () => {
    const p = planDestinatairesDevis({ financementTiers: true, emailStagiaire: "eleve@x.fr", emailFinanceur: "Compta@Medialys.fr " });
    expect(p.destinataires).toEqual([{ role: "stagiaire", email: "eleve@x.fr" }, { role: "financeur", email: "compta@medialys.fr" }]);
  });
  it("financement personnel : stagiaire seul", () => {
    expect(planDestinatairesDevis({ financementTiers: false, emailStagiaire: "eleve@x.fr", emailFinanceur: "f@y.fr" }).destinataires).toHaveLength(1);
  });
  it("adresses identiques : un seul envoi", () => {
    const p = planDestinatairesDevis({ financementTiers: true, emailStagiaire: "a@x.fr", emailFinanceur: "A@X.fr" });
    expect(p.destinataires).toEqual([{ role: "stagiaire_financeur", email: "a@x.fr" }]);
  });
  it("financeur absent ou invalide : alerte, pas d'envoi financeur", () => {
    expect(planDestinatairesDevis({ financementTiers: true, emailStagiaire: "a@x.fr", emailFinanceur: "" }).alertes[0]).toMatch(/absent/);
    const p = planDestinatairesDevis({ financementTiers: true, emailStagiaire: "a@x.fr", emailFinanceur: "pas-un-mail" });
    expect(p.destinataires).toHaveLength(1);
    expect(p.alertes[0]).toMatch(/invalide/);
  });
});

describe("envoi idempotent", () => {
  const dests: Destinataire[] = [{ role: "stagiaire", email: "a@x.fr" }, { role: "financeur", email: "f@y.fr" }];
  it("deux envois distincts", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const r = await envoyerDevisAuxDestinataires(dests, journalMemoire(), send);
    expect(send).toHaveBeenCalledTimes(2);
    expect(r.map(x => x.statut)).toEqual(["envoye", "envoye"]);
  });
  it("échec financeur puis relance sans renvoyer au stagiaire", async () => {
    const j = journalMemoire();
    const send = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("503"));
    const r1 = await envoyerDevisAuxDestinataires(dests, j, send);
    expect(r1[1]).toMatchObject({ statut: "echec", erreur: "503" });
    const send2 = vi.fn().mockResolvedValue(undefined);
    const r2 = await envoyerDevisAuxDestinataires(dests, j, send2);
    expect(send2).toHaveBeenCalledTimes(1);
    expect(send2).toHaveBeenCalledWith(dests[1]);
    expect(r2.map(x => x.statut)).toEqual(["deja_envoye", "envoye"]);
  });
  it("clic répété : rien n'est renvoyé", async () => {
    const send = vi.fn();
    const r = await envoyerDevisAuxDestinataires(dests, journalMemoire({ "a@x.fr": "envoye", "f@y.fr": "en_cours" }), send);
    expect(send).not.toHaveBeenCalled();
    expect(r.map(x => x.statut)).toEqual(["deja_envoye", "en_cours_ailleurs"]);
  });
  it("journal indisponible : aucun envoi", async () => {
    const send = vi.fn();
    const j: JournalDevis = { reserver: () => Promise.reject(new Error("RLS")), marquer: async () => {} };
    const r = await envoyerDevisAuxDestinataires(dests.slice(0, 1), j, send);
    expect(send).not.toHaveBeenCalled();
    expect(r[0].statut).toBe("echec");
  });
});
