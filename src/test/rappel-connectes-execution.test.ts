// @vitest-environment node
import { describe, it, expect } from "vitest";
import { executerRappelConnectes, type CircuitRappelConnectes } from "../../supabase/functions/_shared/rappelConnectesExecution";
import type { DossierRappel } from "../../supabase/functions/_shared/rappelTheoriquePriorite";

function fixture() {
  const d: DossierRappel = {
    id: "eleve", filiere: "vtc", accesActif: true, exclu: false, dejaConnecte: true, incidentTechnique: false,
    financementVerifie: { cpf: false, engagementsFranceTravail: false },
    obligations: [{ id: 2, obligatoire: true, pratique: false, dispense: false, terminee: false }],
    passage: { id: "examen", dossierId: "eleve", dateReelle: "2026-11-17", source: "admin_audite", statut: "present" },
  };
  const claims = new Set<string>();
  const receipts: string[] = [];
  let sends = 0;
  const lire = async () => ({ dossier: structuredClone(d), maintenant: new Date("2026-11-18T10:00:00Z"), premiereDateExamenEligible: "2026-11-17", historique: [] });
  const circuit: CircuitRappelConnectes = {
    actif: true,
    preuves: { datesRaccordees: true, progressionCanoniqueRaccordee: true, financementRaccorde: true, exclusionsRaccordees: true, verrouAtomiqueTeste: true, transportTeste: true, restaurationIndependanteProuvee: true },
    lireServeur: lire, relireApresReservation: lire,
    reserverAtomiquement: async cle => { if (claims.has(cle)) return null; claims.add(cle); return cle; },
    journaliser: async (_, receipt) => { receipts.push(receipt.etat); },
    envoyer: async () => { sends++; return { etat: "accepte", providerId: "receipt-1" }; },
  };
  return { circuit, d, claims, receipts, sends: () => sends };
}
describe("Circuit distinct : transports synthétiques, jamais des emails réels", () => {
  it("deux exécutions concurrentes : un seul transport", async () => {
    const f = fixture();
    const result = await Promise.all([executerRappelConnectes(f.circuit), executerRappelConnectes(f.circuit)]);
    expect(result.map(r => r.etat).sort()).toEqual(["accepte", "deja_reserve"]);
    expect(f.sends()).toBe(1);
  });
  for (const preuve of Object.keys(fixture().circuit.preuves) as Array<keyof CircuitRappelConnectes["preuves"]>) {
    it(`aucune expédition si preuve ${preuve} manque`, async () => {
      const f = fixture(); f.circuit.preuves[preuve] = false;
      expect((await executerRappelConnectes(f.circuit)).etat).toBe("bloque");
      expect(f.claims.size).toBe(0); expect(f.sends()).toBe(0);
    });
  }
  it("campagne désactivée : même aucune lecture", async () => {
    const f = fixture(); f.circuit.actif = false;
    f.circuit.lireServeur = async () => { throw new Error("must not read"); };
    expect((await executerRappelConnectes(f.circuit)).etat).toBe("inactif");
    expect(f.sends()).toBe(0);
  });
  it("complétion après réservation et avant transport : arrêt immédiat", async () => {
    const f = fixture(); const lire = f.circuit.relireApresReservation;
    f.circuit.relireApresReservation = async id => {
      const row = f.d.obligations?.[0]; if (row) row.terminee = true;
      return lire(id);
    };
    expect((await executerRappelConnectes(f.circuit)).etat).toBe("arrete_avant_envoi");
    expect(f.receipts).toEqual(["arrete_avant_envoi"]); expect(f.sends()).toBe(0);
  });
  it("absence constatée juste avant envoi exclue", async () => {
    const f = fixture(); const lire = f.circuit.relireApresReservation;
    f.circuit.relireApresReservation = async id => { if (f.d.passage) f.d.passage.statut = "absent"; return lire(id); };
    expect((await executerRappelConnectes(f.circuit)).etat).toBe("arrete_avant_envoi"); expect(f.sends()).toBe(0);
  });
  it("panne après début transport : issue indéterminée sans rejeu", async () => {
    const f = fixture(); f.circuit.envoyer = async () => { throw new Error("timeout"); };
    expect((await executerRappelConnectes(f.circuit)).etat).toBe("indetermine");
    expect((await executerRappelConnectes(f.circuit)).etat).toBe("deja_reserve");
    expect(f.receipts).toEqual(["indetermine"]);
  });
  it("journal en panne après acceptation : réservation maintenue", async () => {
    const f = fixture(); f.circuit.journaliser = async () => { throw new Error("unavailable"); };
    expect((await executerRappelConnectes(f.circuit)).etat).toBe("indetermine");
    expect((await executerRappelConnectes(f.circuit)).etat).toBe("deja_reserve"); expect(f.sends()).toBe(1);
  });
  it("jamais connecté : nouvelle campagne ne réserve rien", async () => {
    const f = fixture(); f.d.dejaConnecte = false;
    expect((await executerRappelConnectes(f.circuit)).etat).toBe("bloque"); expect(f.claims.size).toBe(0); expect(f.sends()).toBe(0);
  });
  it("échéance changée durant la lecture : aucun mail périmé", async () => {
    const f = fixture(); const lire = f.circuit.relireApresReservation;
    f.circuit.relireApresReservation = async id => ({ ...await lire(id), maintenant: new Date("2026-11-20T10:00:00Z") });
    expect((await executerRappelConnectes(f.circuit)).etat).toBe("arrete_avant_envoi"); expect(f.sends()).toBe(0);
  });
});