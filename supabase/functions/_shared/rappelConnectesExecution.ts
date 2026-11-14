/** Transport orchestration only. Production adapters must supply server evidence and an atomic DB claim. */
import { preparerRappelTheorique, type DecisionRappel } from "./rappelTheoriquePriorite.ts";

type Lecture = Parameters<typeof preparerRappelTheorique>[0];
type Preparation = Extract<DecisionRappel, { etat: "preparer" }>;
export interface PreuvesActivationRappel {
  datesRaccordees: boolean;
  progressionCanoniqueRaccordee: boolean;
  financementRaccorde: boolean;
  exclusionsRaccordees: boolean;
  verrouAtomiqueTeste: boolean;
  transportTeste: boolean;
  restaurationIndependanteProuvee: boolean;
}
export type ReceiptRappel = { etat: "accepte"; providerId: string } | { etat: "rejete" | "indetermine" };
export interface CircuitRappelConnectes {
  actif: boolean;
  preuves: PreuvesActivationRappel;
  /** Never accepts browser percentages or unverified client dates. */
  lireServeur: () => Promise<Lecture>;
  /** Unique DB key; conflicts return null; no reclaim of uncertain attempts. */
  reserverAtomiquement: (cle: string) => Promise<string | null>;
  /** Reread excludes this own reservation, but retains every other receipt. */
  relireApresReservation: (reservationId: string) => Promise<Lecture>;
  /** Append-only outcome, no deletion of either evidence or attempt. */
  journaliser: (reservationId: string, receipt: ReceiptRappel | { etat: "arrete_avant_envoi" }) => Promise<void>;
  envoyer: (preparation: Preparation, idempotencyKey: string) => Promise<ReceiptRappel>;
}
export type ResultatExecutionRappel =
  | { etat: "inactif" | "bloque" | "deja_reserve" | "arrete_avant_envoi" }
  | ReceiptRappel;

export async function executerRappelConnectes(circuit: CircuitRappelConnectes): Promise<ResultatExecutionRappel> {
  if (!circuit.actif) return { etat: "inactif" };
  if (!Object.values(circuit.preuves).every(v => v === true)) return { etat: "bloque" };
  let reservationId: string | null = null;
  let transportCommence = false;
  try {
    const initial = preparerRappelTheorique(await circuit.lireServeur());
    if (initial.etat !== "preparer") return { etat: "bloque" };
    reservationId = await circuit.reserverAtomiquement(initial.cle);
    if (!reservationId) return { etat: "deja_reserve" };
    const frais = preparerRappelTheorique(await circuit.relireApresReservation(reservationId));
    if (frais.etat !== "preparer" || frais.cle !== initial.cle) {
      await circuit.journaliser(reservationId, { etat: "arrete_avant_envoi" });
      return { etat: "arrete_avant_envoi" };
    }
    transportCommence = true;
    const receipt = await circuit.envoyer(frais, frais.cle);
    if (receipt.etat === "accepte" && !receipt.providerId.trim()) throw new Error("missing provider receipt");
    await circuit.journaliser(reservationId, receipt);
    return receipt;
  } catch {
    // Unknown transport outcome or failed receipt persistence retains the claim forever until reviewed.
    // Never resend automatically: provider acceptance cannot be inferred from a local timeout.
    if (reservationId) {
      try { await circuit.journaliser(reservationId, { etat: transportCommence ? "indetermine" : "arrete_avant_envoi" }); }
      catch { /* The durable claim itself prevents replay if journal storage is unavailable. */ }
    }
    return { etat: transportCommence ? "indetermine" : "bloque" };
  }
}