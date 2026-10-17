import { type TrainingContract, validateContract, emptyPratique } from './model';
import { CONSENTEMENTS_VERSION, DEVIS_CONTRAT_VERSION } from './consentements';

/** Snapshot figé enregistré avec le devis : unique source du contrat lié, de l'aperçu, du PDF et de la signature. */
export interface DevisContratSnapshot {
  version: string; consentements_version: string; genere_le: string;
  contract: TrainingContract;
  validation: { ready: boolean; issues: string[]; today: string; earliestStart: string; status: string };
}
export function buildDevisContratSnapshot(c: TrainingContract, now: Date): DevisContratSnapshot {
  // Aucune date de conclusion/signature n'est jamais posée ici : seul le serveur horodate la signature.
  const contract: TrainingContract = { ...c, concludedAt: null, signedAt: null };
  const v = validateContract(contract, contract.learnerId, now);
  return { version: DEVIS_CONTRAT_VERSION, consentements_version: CONSENTEMENTS_VERSION, genere_le: now.toISOString(), contract,
    validation: { ready: v.ready, issues: v.issues, today: v.today, earliestStart: v.earliestStart, status: v.status } };
}
export function parseDevisContratSnapshot(raw: unknown): DevisContratSnapshot | null {
  const s = raw as DevisContratSnapshot | null;
  if (!s || typeof s !== 'object' || s.version !== DEVIS_CONTRAT_VERSION || !s.contract?.fields) return null;
  return s;
}
/** Reprend un document précédent comme nouveau brouillon : nouvelle référence, à revérifier, jamais signé. */
export function draftFromSnapshot(s: DevisContratSnapshot, learnerId: string): TrainingContract | null {
  if (s.contract.learnerId !== learnerId) return null;
  return { ...s.contract, reference: `CF-${crypto.randomUUID()}`, verified: false, concludedAt: null, signedAt: null,
    pratique: { ...emptyPratique(), ...(s.contract.pratique ?? {}) } };
}
/** Le régime contrat individuel ne s'applique qu'au financement personnel. */
export const devisValantContrat = (c: TrainingContract) => c.funding === 'personnel';
