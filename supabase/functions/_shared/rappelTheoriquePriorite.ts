/** Isolated preparation only: no database writes, transport, scheduler or booking mutation. */
import { apercuHtmlRappel, apercuTexteRappel, modeleRappelTheorique, OBJET_RAPPEL_THEORIQUE, type ModeleRappelTheorique, type FinancementRappelVerifie } from "./modelesRappelTheorique.ts";
export const RAPPEL_THEORIQUE_VERSION = "2026-11-14-connectes-v7";
export const RAPPEL_THEORIQUE_OBJET = OBJET_RAPPEL_THEORIQUE;
export const RAPPEL_THEORIQUE_TEXTE = apercuTexteRappel(modeleRappelTheorique("ferme"));

export interface ObligationCanonique {
  id: number;
  obligatoire: boolean;
  pratique: boolean;
  dispense: boolean;
  /** Final verdict supplied by the shared canonical server progression, not browser percentages. */
  terminee: boolean | null;
}
export interface DossierRappel {
  id: string;
  filiere: "vtc" | "taxi" | "hors_perimetre";
  accesActif: boolean;
  exclu: boolean;
  /** Confirmed account-owned connection evidence; null/undefined never means connected. */
  dejaConnecte?: boolean | null;
  incidentTechnique?: boolean | null;
  /** Verified effective allocation policy, not a proposed priority projection. */
  prioritePratiqueEffective?: boolean;
  obligations: ObligationCanonique[] | null;
  financementVerifie?: FinancementRappelVerifie;
  examenPrevu?: {
    id: string;
    dossierId: string;
    datePrevue: string;
    statut: "confirme" | "annule" | "reporte" | "inconnu";
  } | null;
  passage: {
    id: string;
    dossierId: string;
    dateReelle: string;
    /** A schedule or a result without verified dated participation is insufficient. */
    source: "cma_verifie" | "admin_audite" | "planning";
    statut: "present" | "absent" | "reporte" | "annule" | "inconnu";
  } | null;
}
export interface HistoriqueRappel {
  passageId: string;
  dossierId: string;
  jourEcheance: string;
  etat: "reserve" | "accepte" | "remis" | "rejete" | "indetermine";
}
export function jourParis(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(instant);
}
function numeroJour(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const ms = Date.parse(`${iso}T12:00:00Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== iso) return null;
  return Math.floor(ms / 86400000);
}
export function progressionNonPratique(obligations: ObligationCanonique[] | null):
  { etat: "inconnu" } | { etat: "ok"; total: number; restants: number[]; complete: boolean } {
  if (!obligations) return { etat: "inconnu" };
  const uniques = new Map<number, ObligationCanonique>();
  for (const obligation of obligations) {
    if (!Number.isSafeInteger(obligation.id) || obligation.id <= 0) return { etat: "inconnu" };
    const ancien = uniques.get(obligation.id);
    // Conflicting canonical projections must never grant priority or trigger a reminder.
    if (ancien && (ancien.pratique !== obligation.pratique || ancien.obligatoire !== obligation.obligatoire
      || ancien.dispense !== obligation.dispense || ancien.terminee !== obligation.terminee)) return { etat: "inconnu" };
    uniques.set(obligation.id, obligation);
  }
  const requis = [...uniques.values()].filter(o => o.obligatoire && !o.pratique && !o.dispense);
  if (requis.some(o => o.terminee === null)) return { etat: "inconnu" };
  const restants = requis.filter(o => !o.terminee).map(o => o.id);
  return { etat: "ok", total: requis.length, restants, complete: restants.length === 0 };
}
export type DecisionRappel =
  | { etat: "arreter"; raison: string }
  | { etat: "attendre" | "a_verifier"; raison: string }
  | { etat: "preparer"; jourEcheance: string; rang: number; cle: string; objet: string; texte: string; html: string | null;
      phase: "avant" | "apres"; modele: ModeleRappelTheorique; activationAutorisee: false; pointsAValider: string[] };

export function preparerRappelTheorique(input: {
  dossier: DossierRappel;
  maintenant: Date;
  /** Earliest exam occurrence eligible after activation; no historic catch-up. Null = not configured. */
  premiereDateExamenEligible: string | null;
  historique: readonly HistoriqueRappel[] | null;
}): DecisionRappel {
  const { dossier, historique } = input;
  if (dossier.filiere === "hors_perimetre" || dossier.exclu || !dossier.accesActif) return { etat: "arreter", raison: "dossier exclu" };
  if (dossier.dejaConnecte === false) return { etat: "arreter", raison: "non connecté : campagne historique uniquement" };
  if (dossier.dejaConnecte !== true) return { etat: "a_verifier", raison: "connexion du dossier non prouvée" };
  if (dossier.incidentTechnique !== false) return { etat: "a_verifier", raison: "incident technique ou état non vérifié" };
  const progression = progressionNonPratique(dossier.obligations);
  if (progression.etat === "inconnu") return { etat: "a_verifier", raison: "progression canonique indisponible" };
  if (progression.complete) return { etat: "arreter", raison: "modules non pratiques complets" };
  if (!Number.isFinite(input.maintenant.getTime())) return { etat: "a_verifier", raison: "horloge serveur indisponible" };
  const jour = jourParis(input.maintenant);
  const aujourdHui = numeroJour(jour);
  const borne = input.premiereDateExamenEligible ? numeroJour(input.premiereDateExamenEligible) : null;
  if (aujourdHui === null || borne === null) return { etat: "a_verifier", raison: "date ou borne non vérifiée" };
  const prevu = dossier.examenPrevu;
  if (prevu && (!dossier.passage || dossier.passage.statut !== "present")) {
    if (!prevu.id || prevu.dossierId !== dossier.id || prevu.statut === "inconnu") return { etat: "a_verifier", raison: "examen prévu non vérifié" };
    if (prevu.statut !== "confirme") return { etat: "arreter", raison: "examen prévu annulé ou reporté" };
    const datePrevue = numeroJour(prevu.datePrevue);
    if (datePrevue === null) return { etat: "a_verifier", raison: "date prévue invalide" };
    if (datePrevue > aujourdHui) {
      if (datePrevue < borne) return { etat: "arreter", raison: "ancien examen hors activation" };
      if (datePrevue - aujourdHui !== 7) return { etat: "attendre", raison: "hors J−7" };
      if (dossier.passage?.statut === "absent") return { etat: "arreter", raison: "absence déclarée" };
      return construirePreparation(input, prevu.id, jour, 0, "avant", "ferme");
    }
  }
  const passage = dossier.passage;
  if (!passage || passage.dossierId !== dossier.id || !passage.id || passage.source === "planning"
    || passage.statut === "inconnu") return { etat: "a_verifier", raison: "passage réel non prouvé" };
  if (passage.statut !== "present") return { etat: "arreter", raison: "absent, reporté ou annulé" };
  const examen = numeroJour(passage.dateReelle);
  if (examen === null || borne === null) return { etat: "a_verifier", raison: "date ou borne non vérifiée" };
  if (examen < borne) return { etat: "arreter", raison: "ancien passage hors activation" };
  const ecart = aujourdHui - examen;
  if (ecart < 1 || ecart % 2 === 0) return { etat: "attendre", raison: "hors échéance impaire après examen" };
  return construirePreparation(input, passage.id, jour, (ecart + 1) / 2, "apres", ecart <= 5 ? "ferme" : "obligations");
}
function construirePreparation(
  input: Parameters<typeof preparerRappelTheorique>[0], occurrenceId: string, jour: string,
  rang: number, phase: "avant" | "apres", type: "ferme" | "obligations",
): DecisionRappel {
  const { dossier, historique } = input;
  if (!historique) return { etat: "a_verifier", raison: "journal indisponible" };
  const memePassage = historique.filter(h => h.dossierId === dossier.id && h.passageId === occurrenceId);
  if (memePassage.some(h => ["reserve", "indetermine", "rejete"].includes(h.etat))) {
    return { etat: "a_verifier", raison: "envoi précédent réservé, indéterminé ou rejeté" };
  }
  if (memePassage.some(h => h.jourEcheance >= jour)) return { etat: "attendre", raison: "échéance déjà traitée" };
  const modele = modeleRappelTheorique(type, phase === "avant", dossier.financementVerifie, dossier.prioritePratiqueEffective === true);
  if (modele.financementAVerifier) return { etat: "a_verifier", raison: "financement CPF et engagements France Travail non vérifiés" };
  return {
    etat: "preparer", jourEcheance: jour, rang, phase, modele, activationAutorisee: false,
    pointsAValider: ["Preuves datées et obligations canoniques raccordées", "Verrou atomique et transport testés", "Activation de production non effectuée"],
    // Template revisions must not allow a second send for the same occurrence/day.
    cle: ["rappel_modules_connectes_theorique", dossier.id, occurrenceId, phase, jour].map(encodeURIComponent).join(":"),
    objet: modele.objet, texte: apercuTexteRappel(modele), html: apercuHtmlRappel(modele),
  };
}

/** Always fresh at point of preparation; no cached learner state or sending capability. */
export async function relireEtPreparerRappel(
  lireServeur: () => Promise<Parameters<typeof preparerRappelTheorique>[0]>,
): Promise<DecisionRappel> {
  try { return preparerRappelTheorique(await lireServeur()); }
  catch { return { etat: "a_verifier", raison: "lecture serveur impossible" }; }
}

export interface CandidatPriorite {
  dossierId: string;
  ordreContractuel: number;
  reservationExistante: boolean;
  obligations: ObligationCanonique[] | null;
  /** Only a verified audited admin exception may be projected here. */
  exceptionAdminVerifiee: boolean;
}
/** Advisory order only. Never removes candidates, books a slot or denies a reservation. */
export function projeterPrioritePratique(candidats: readonly CandidatPriorite[]): Array<CandidatPriorite & {
  priorite: "reservation_existante" | "prioritaire" | "non_prioritaire" | "a_verifier";
}> {
  const ordre = { reservation_existante: 0, prioritaire: 1, non_prioritaire: 2, a_verifier: 3 };
  return candidats.map(c => {
    const progression = progressionNonPratique(c.obligations);
    const priorite = c.reservationExistante ? "reservation_existante" as const
      : c.exceptionAdminVerifiee ? "prioritaire" as const
      : progression.etat === "inconnu" ? "a_verifier" as const
      : progression.complete ? "prioritaire" as const : "non_prioritaire" as const;
    return { ...c, priorite };
  }).sort((a, b) => ordre[a.priorite] - ordre[b.priorite] || a.ordreContractuel - b.ordreContractuel);
}