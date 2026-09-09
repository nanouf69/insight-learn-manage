/**
 * Récupération automatique après un conflit P0409 (stale_canonical_question_write).
 *
 * Règle : on ne contourne JAMAIS la protection serveur. On rebase les actions
 * locales sur la dernière version canonique lue en base :
 *  - une suppression déjà appliquée en base est abandonnée (rien à refaire) ;
 *  - une question désactivée en base n'est jamais réactivée par un upsert local ;
 *  - un upsert local n'est rejoué que si la modification locale est réellement
 *    postérieure à la version canonique fraîche (dernier écrivain gagne) ;
 *  - sinon, la version base gagne et l'action locale obsolète est abandonnée.
 */

export interface CanonicalRowLike {
  quiz_id: string;
  section_id: number | string;
  legacy_question_id: number | string;
  active: boolean;
  updated_at: string;
}

export interface CanonicalActionLike {
  action: "upsert" | "deactivate";
  quiz_id: string;
  section_id: number | string;
  legacy_question_id: number | string;
  expected_updated_at?: string | null;
  /** Horodatage de l'édition locale réelle (jamais envoyé au RPC). */
  local_edited_at?: string | null;
  [key: string]: unknown;
}

export const canonicalKey = (
  quizId: string,
  sectionId: number | string,
  legacyQuestionId: number | string,
): string => `${quizId}:${Number(sectionId)}:${Number(legacyQuestionId)}`;

const ts = (value: unknown): number => {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : NaN;
};

export function rebaseCanonicalActions<T extends CanonicalActionLike>(
  actions: T[],
  freshRows: CanonicalRowLike[],
): T[] {
  const byKey = new Map(
    freshRows.map((row) => [canonicalKey(row.quiz_id, row.section_id, row.legacy_question_id), row]),
  );

  const rebased: T[] = [];
  for (const action of actions) {
    const fresh = byKey.get(canonicalKey(action.quiz_id, action.section_id, action.legacy_question_id));

    if (action.action === "deactivate") {
      // Déjà supprimée en base (ou jamais créée) : la suppression est acquise.
      if (!fresh || !fresh.active) continue;
      rebased.push({ ...action, expected_updated_at: fresh.updated_at });
      continue;
    }

    if (!fresh) {
      // Question réellement nouvelle : insertion, sans verrou de version.
      rebased.push({ ...action, expected_updated_at: null });
      continue;
    }

    // Suppression définitive en base : aucune copie locale ne la ressuscite.
    if (!fresh.active) continue;

    const localEditedAt = ts(action.local_edited_at);
    const freshUpdatedAt = ts(fresh.updated_at);
    const localIsNewer =
      Number.isFinite(localEditedAt) &&
      (!Number.isFinite(freshUpdatedAt) || localEditedAt > freshUpdatedAt);

    // Modification locale obsolète : la base gagne, on abandonne l'action.
    if (!localIsNewer) continue;

    rebased.push({ ...action, expected_updated_at: fresh.updated_at });
  }

  return rebased;
}

/** Retire les champs internes avant l'appel RPC. */
export function toRpcCanonicalActions<T extends CanonicalActionLike>(actions: T[]): Record<string, unknown>[] {
  return actions.map(({ local_edited_at: _localEditedAt, ...rest }) => rest as Record<string, unknown>);
}

export const isStaleCanonicalQuestionError = (error: unknown): boolean => {
  const maybeError = error as { code?: string; message?: string } | null | undefined;
  const message = String(maybeError?.message ?? "");
  return (
    maybeError?.code === "P0409" ||
    message.includes("stale_canonical_question_write") ||
    message.includes("canonical_question_deleted")
  );
};
