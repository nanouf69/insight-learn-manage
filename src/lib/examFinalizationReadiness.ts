/**
 * ÉTAPE 3 — SÉCURISATION DE « TERMINER LA MATIÈRE » (contrôle avant clôture).
 *
 * Règle absolue : on ne clôture une matière QUE si toutes les écritures
 * RÉELLEMENT PRODUITES par le navigateur ont été confirmées par le serveur.
 *
 * ⚠️ Ce contrôle ne regarde JAMAIS le nombre de questions répondues : un élève
 * a parfaitement le droit de laisser une question (ou une QRC) sans réponse.
 * On vérifie uniquement :
 *   1. l'identité du passage (élève + examen + matière + tentative) ;
 *   2. l'absence d'écriture locale encore en attente pour ce passage ;
 *   3. la cohérence du dernier numéro d'ordre confirmé par le serveur ;
 *   4. l'absence de refus définitif non traité.
 *
 * Ce module est PUR : il ne lit ni n'écrit la file locale, ne supprime rien,
 * ne modifie aucune réponse. Il répond seulement « on peut » / « on attend ».
 */

export const MESSAGE_SYNCHRONISATION_EN_COURS =
  "Synchronisation de vos réponses en cours. Merci de patienter avant de terminer la matière.";

export type FinalizationBlockReason =
  | "identite"
  | "ecritures_en_attente"
  | "ordre_non_confirme"
  | "refus_serveur";

export interface FinalizationContext {
  /** Identité du passage visé par le clic « Terminer ». */
  apprenantId: string;
  examenId: string;
  matiereId: string;
  tentative: number;
  /** Identité réellement portée par la tentative ouverte côté serveur. */
  attempt: {
    apprenantId: string;
    examenId: string;
    matiereId: string;
    tentative: number;
    /** true si le serveur considère déjà cette tentative comme finalisée. */
    dejaFinalisee?: boolean;
  } | null;
  /** Nombre d'écritures encore en file locale POUR CE PASSAGE. */
  ecrituresLocalesEnAttente: number;
  /** Nombre d'écritures encore en attente dans le noyau V2 (si raccordé). */
  ecrituresNoyauEnAttente?: number;
  /** Dernier numéro d'ordre produit par le client pour ce passage. */
  dernierOrdreClient: number;
  /** Dernier numéro d'ordre confirmé par le serveur pour ce passage. */
  dernierOrdreConfirme: number;
  /** Refus définitif du serveur non résolu (48 h, droits, passage fermé…). */
  refus?: { reason: string; message?: string } | null;
}

export interface FinalizationReadiness {
  pret: boolean;
  /** true si la tentative est DÉJÀ finalisée : rien à refaire, aucune erreur. */
  dejaFinalisee: boolean;
  raison?: FinalizationBlockReason;
  message?: string;
}

const memeIdentite = (ctx: FinalizationContext): boolean => {
  const a = ctx.attempt;
  if (!a) return true; // passage non raccordé au noyau : identité portée par l'ancien circuit
  return (
    a.apprenantId === ctx.apprenantId &&
    a.examenId === ctx.examenId &&
    a.matiereId === ctx.matiereId &&
    Number(a.tentative) === Number(ctx.tentative)
  );
};

/** Décide si la finalisation peut partir. Aucune donnée n'est touchée. */
export function assessFinalizationReadiness(ctx: FinalizationContext): FinalizationReadiness {
  if (ctx.attempt?.dejaFinalisee) {
    return { pret: false, dejaFinalisee: true };
  }

  if (!memeIdentite(ctx)) {
    return {
      pret: false,
      dejaFinalisee: false,
      raison: "identite",
      message:
        "Ce passage ne correspond pas à la matière ouverte. Rien n'a été modifié : rechargez la page avant de terminer.",
    };
  }

  if (ctx.refus) {
    return {
      pret: false,
      dejaFinalisee: false,
      raison: "refus_serveur",
      message:
        ctx.refus.message ??
        "Le serveur a refusé une sauvegarde. Vos réponses sont conservées sur cet appareil : contactez le centre avant de terminer.",
    };
  }

  const enAttente =
    Math.max(0, ctx.ecrituresLocalesEnAttente ?? 0) + Math.max(0, ctx.ecrituresNoyauEnAttente ?? 0);
  if (enAttente > 0) {
    return {
      pret: false,
      dejaFinalisee: false,
      raison: "ecritures_en_attente",
      message: MESSAGE_SYNCHRONISATION_EN_COURS,
    };
  }

  if (Number(ctx.dernierOrdreConfirme ?? 0) < Number(ctx.dernierOrdreClient ?? 0)) {
    return {
      pret: false,
      dejaFinalisee: false,
      raison: "ordre_non_confirme",
      message: MESSAGE_SYNCHRONISATION_EN_COURS,
    };
  }

  return { pret: true, dejaFinalisee: false };
}

/**
 * Attend (sans rien écrire) que la synchronisation se termine, puis répond.
 * Une dernière réponse en cours d'envoi n'empêche donc pas la clôture : elle
 * la retarde le temps de la confirmation serveur.
 */
export async function attendreFinalizationReadiness(params: {
  lire: () => FinalizationContext;
  relancerSynchronisation?: () => void | Promise<void>;
  timeoutMs?: number;
  intervalMs?: number;
  attendre?: (ms: number) => Promise<void>;
}): Promise<FinalizationReadiness> {
  const timeout = params.timeoutMs ?? 15000;
  const interval = params.intervalMs ?? 200;
  const pause = params.attendre ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const debut = Date.now();
  let verdict = assessFinalizationReadiness(params.lire());
  while (!verdict.pret && !verdict.dejaFinalisee && Date.now() - debut < timeout) {
    if (verdict.raison === "identite" || verdict.raison === "refus_serveur") return verdict;
    await params.relancerSynchronisation?.();
    await pause(interval);
    verdict = assessFinalizationReadiness(params.lire());
  }
  return verdict;
}
