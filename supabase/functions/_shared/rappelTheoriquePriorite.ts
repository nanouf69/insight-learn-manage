/** Isolated preparation only: no database writes, transport, scheduler or booking mutation. */
export const RAPPEL_THEORIQUE_VERSION = "2026-11-13-priorite-v2";
export const RAPPEL_THEORIQUE_OBJET = "Rappel important – Finalisez vos modules pour votre entraînement pratique";
export const RAPPEL_THEORIQUE_TEXTE = "Bonjour, À la suite de votre examen théorique, nous vous invitons à terminer l'ensemble des modules de votre formation sur notre plateforme e-learning, à l'exception de la partie pratique. Les candidats ayant terminé l'ensemble de leurs modules seront prioritaires pour le choix d'une date d'entraînement pratique. Si vos modules ne sont pas encore terminés, vous ne serez donc pas prioritaire dans l'attribution des créneaux disponibles. Nous vous invitons à finaliser votre parcours dès que possible afin de bénéficier de cette priorité. En cas de difficulté technique ou de problème de validation d'un module, merci de contacter notre centre de formation. Cordialement, L'équipe Ftransport";

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
  obligations: ObligationCanonique[] | null;
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
  | { etat: "preparer"; jourEcheance: string; rang: number; cle: string; objet: string; texte: string };

export function preparerRappelTheorique(input: {
  dossier: DossierRappel;
  maintenant: Date;
  /** Earliest real exam date eligible after activation; no historic catch-up. Null = not configured. */
  premiereDateExamenEligible: string | null;
  historique: readonly HistoriqueRappel[] | null;
}): DecisionRappel {
  const { dossier, historique } = input;
  if (dossier.filiere === "hors_perimetre" || dossier.exclu || !dossier.accesActif) return { etat: "arreter", raison: "dossier exclu" };
  const progression = progressionNonPratique(dossier.obligations);
  if (progression.etat === "inconnu") return { etat: "a_verifier", raison: "progression canonique indisponible" };
  if (progression.complete) return { etat: "arreter", raison: "modules non pratiques complets" };
  const passage = dossier.passage;
  if (!passage || passage.dossierId !== dossier.id || !passage.id || passage.source === "planning"
    || passage.statut === "inconnu") return { etat: "a_verifier", raison: "passage réel non prouvé" };
  if (passage.statut !== "present") return { etat: "arreter", raison: "absent, reporté ou annulé" };
  const examen = numeroJour(passage.dateReelle);
  const borne = input.premiereDateExamenEligible ? numeroJour(input.premiereDateExamenEligible) : null;
  if (examen === null || borne === null) return { etat: "a_verifier", raison: "date ou borne non vérifiée" };
  if (examen < borne) return { etat: "arreter", raison: "ancien passage hors activation" };
  const jour = jourParis(input.maintenant);
  const aujourdHui = numeroJour(jour);
  if (aujourdHui === null) return { etat: "a_verifier", raison: "horloge serveur indisponible" };
  const ecart = aujourdHui - examen;
  if (ecart < 1 || ecart % 2 === 0) return { etat: "attendre", raison: "hors J+1/J+3/J+5" };
  if (!historique) return { etat: "a_verifier", raison: "journal indisponible" };
  const memePassage = historique.filter(h => h.dossierId === dossier.id && h.passageId === passage.id);
  if (memePassage.some(h => ["reserve", "indetermine", "rejete"].includes(h.etat))) {
    return { etat: "a_verifier", raison: "envoi précédent réservé, indéterminé ou rejeté" };
  }
  if (memePassage.some(h => h.jourEcheance >= jour)) return { etat: "attendre", raison: "échéance déjà traitée" };
  return {
    etat: "preparer", jourEcheance: jour, rang: (ecart + 1) / 2,
    cle: ["rappel_modules_theorique", dossier.id, passage.id, jour, RAPPEL_THEORIQUE_VERSION].map(encodeURIComponent).join(":"),
    objet: RAPPEL_THEORIQUE_OBJET, texte: RAPPEL_THEORIQUE_TEXTE,
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