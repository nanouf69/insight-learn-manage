/**
 * FINALISATION IDEMPOTENTE D'UNE MATIÈRE D'EXAMEN BLANC.
 *
 * Objectif : un double clic sur « Terminer », deux requêtes simultanées, un
 * réessai après coupure réseau ou un rechargement de page ne doivent JAMAIS
 * créer deux passages réels différents (ni deux écritures techniques rivales).
 *
 * Aucune donnée existante n'est supprimée ni réécrite : on réutilise simplement
 * le numéro de tentative du passage en cours pour que l'enregistrement retombe
 * exactement sur la même ligne (upsert sur apprenant+examen+matière+tentative).
 */
import { PASSAGE_WINDOW_MS, normalizeMatiereId, type PassageRowLike } from "@/lib/examPassageIdentity";
import { isResultPlaceholder } from "@/components/cours-en-ligne/exam-helpers";

/** Clé de finalisation : apprenant + filière + examen + matière + passage visé. */
export function buildFinalizationKey(input: {
  apprenantId: string;
  quizType: string;
  quizId: string;
  matiereId: string;
  tentative: number;
}): string {
  return [
    input.apprenantId,
    input.quizType,
    input.quizId,
    normalizeMatiereId(input.matiereId),
    `T${Math.max(1, Math.floor(input.tentative || 1))}`,
  ].join("|");
}

const inflight = new Map<string, Promise<any>>();

/**
 * Exécute une finalisation au plus une fois à la fois pour une même clé.
 * Un second appel concurrent (double clic, double requête) reçoit exactement le
 * même résultat que le premier, sans seconde écriture.
 */
export function runFinalizationOnce<T>(key: string, task: () => Promise<T>): Promise<T> {
  const current = inflight.get(key);
  if (current) return current as Promise<T>;
  const p = (async () => {
    try {
      return await task();
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

/** Nombre de finalisations actuellement en cours (diagnostic / tests). */
export function getInflightFinalizations(): number {
  return inflight.size;
}

/**
 * Numéro de tentative IDEMPOTENT pour la matière en cours de remise.
 *
 * - Une écriture existante du MÊME passage réel (même matière, moins de
 *   PASSAGE_WINDOW_MS) → on réutilise son numéro : l'upsert met à jour la
 *   ligne au lieu d'en créer une sœur.
 * - Sinon → le numéro demandé est conservé (vraie nouvelle tentative).
 * - Les lignes techniques « en attente de finalisation » sont ignorées.
 */
export function resolveIdempotentTentative(input: {
  rows: PassageRowLike[] | null | undefined;
  quizId: string;
  quizType: string;
  matiereId: string;
  desiredTentative: number;
  now?: number;
}): number {
  const desired = Math.max(1, Math.floor(input.desiredTentative || 1));
  const now = input.now ?? Date.now();
  const matiere = normalizeMatiereId(input.matiereId);

  const siblings = (input.rows || [])
    .filter((r) => r && !isResultPlaceholder(r))
    .filter(
      (r) =>
        String(r?.quiz_id ?? "") === String(input.quizId) &&
        String(r?.quiz_type ?? "") === String(input.quizType) &&
        normalizeMatiereId(r?.matiere_id) === matiere,
    )
    .map((r) => ({
      tentative: Math.max(1, Math.floor(Number(r?.tentative) || 1)),
      time: new Date(r?.completed_at || r?.created_at || 0).getTime() || 0,
    }))
    .filter((r) => r.time > 0 && now - r.time <= PASSAGE_WINDOW_MS)
    .sort((a, b) => b.time - a.time);

  return siblings.length > 0 ? siblings[0].tentative : desired;
}
