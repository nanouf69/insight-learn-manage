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
  choix?: unknown[];
  enonce?: string;
  position?: number;
  image?: unknown;
  image_size?: unknown;
  explication?: unknown;
}

export interface CanonicalActionLike {
  action: "upsert" | "deactivate";
  quiz_id: string;
  section_id: number | string;
  legacy_question_id: number | string;
  expected_updated_at?: string | null;
  /** Horodatage de l'édition locale réelle (jamais envoyé au RPC). */
  local_edited_at?: string | null;
  /** Choix canoniques chargés avant l'édition, utilisé uniquement pour rejouer une suppression. */
  base_choix?: unknown[] | null;
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

const choiceKey = (choice: unknown): string => {
  const value = choice as { lettre?: unknown } | null | undefined;
  const letter = String(value?.lettre ?? "").trim();
  return letter || JSON.stringify(choice);
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

    const baseChoices = Array.isArray(action.base_choix) ? action.base_choix : null;
    const localChoices = Array.isArray(action.choix) ? action.choix : null;
    const freshChoices = Array.isArray(fresh.choix) ? fresh.choix : null;
    if (baseChoices && localChoices && freshChoices) {
      const localKeys = new Set(localChoices.map(choiceKey));
      const removedKeys = new Set(baseChoices.map(choiceKey).filter((key) => !localKeys.has(key)));

      // Une suppression de réponse est une intention explicite, pas un snapshot.
      // Même si la première sauvegarde a produit un updated_at serveur postérieur
      // au second clic, on retire uniquement les réponses supprimées de la version
      // canonique fraîche. Aucune ancienne liste n'est renvoyée au serveur.
      if (removedKeys.size > 0) {
        rebased.push({
          ...action,
          expected_updated_at: fresh.updated_at,
          choix: freshChoices.filter((choice) => !removedKeys.has(choiceKey(choice))),
          ...(fresh.enonce !== undefined ? { enonce: fresh.enonce } : {}),
          ...(fresh.position !== undefined ? { position: fresh.position } : {}),
          ...(fresh.image !== undefined ? { image: fresh.image } : {}),
          ...(fresh.image_size !== undefined ? { image_size: fresh.image_size } : {}),
          ...(fresh.explication !== undefined ? { explication: fresh.explication } : {}),
        });
        continue;
      }
    }

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
  return actions.map(({ local_edited_at: _localEditedAt, base_choix: _baseChoices, ...rest }) => rest as Record<string, unknown>);
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
