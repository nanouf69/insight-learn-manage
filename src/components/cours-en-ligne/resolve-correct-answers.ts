// ============================================================
// CENTRALIZED ADMIN-WINS RESOLVER FOR QUESTION CORRECT ANSWERS
// ============================================================
//
// Règle dure unique de l'application :
//   Dès qu'une question porte un `_editedAt` (édition admin),
//   son tableau `choix` (et donc les `correct: true`) DOIT TOUJOURS
//   gagner sur n'importe quelle autre source — code source, override
//   fournisseur, snapshot DB plus récent, reconstruction bilan,
//   realtime, refetch visibilité, etc.
//
// Tous les points de merge / rehydration doivent passer par ce
// module. Aucune exception nulle part dans la codebase.
// ============================================================

export interface ChoixLike {
  lettre: string;
  texte: string;
  correct?: boolean;
  explication?: string;
}

export interface QuestionLike {
  id?: number;
  enonce?: string;
  choix?: ChoixLike[];
  image?: string | null;
  _editedAt?: string;
  manually_edited?: boolean;
}

/**
 * True dès qu'une question porte la marque d'une édition admin.
 * `_editedAt` est posé par le SaveButton de l'éditeur admin
 * (voir ModuleDetailView ~ ligne 1846 et ~ ligne 3680).
 */
export function hasAdminEdit(q: QuestionLike | null | undefined): boolean {
  if (!q) return false;
  if (typeof q._editedAt === "string" && q._editedAt.trim().length > 0) return true;
  if (q.manually_edited === true) return true;
  return false;
}

/**
 * Renvoie le tableau `choix` qui doit faire foi :
 *  – si `adminCandidate` porte `_editedAt`, on renvoie SES choix sans condition
 *  – sinon on renvoie les choix de l'autre source si elle en a, à défaut ceux de l'admin
 *
 * Ne mute jamais les entrées.
 */
export function resolveCorrectAnswers(
  adminCandidate: QuestionLike | null | undefined,
  otherSource: QuestionLike | null | undefined,
): ChoixLike[] {
  const adminChoix = Array.isArray(adminCandidate?.choix) ? adminCandidate!.choix! : [];
  const otherChoix = Array.isArray(otherSource?.choix) ? otherSource!.choix! : [];

  if (hasAdminEdit(adminCandidate) && adminChoix.length > 0) {
    return adminChoix;
  }
  if (otherChoix.length > 0) return otherChoix;
  return adminChoix;
}

/**
 * Fusionne une question admin (locale / DB) avec une autre source
 * (source code, override fournisseur, snapshot DB plus récent…),
 * en garantissant que les `choix` admin gagnent dès qu'`_editedAt` existe.
 *
 * Convention :
 *   – `adminCandidate` = la version qui pourrait porter l'édition admin
 *   – `otherSource`    = la version qui pourrait écraser (source / override)
 *
 * Si l'admin a édité, l'objet renvoyé est `{ ...other, ...admin, choix: admin.choix }`.
 * Sinon, c'est `{ ...admin, ...other, choix: resolved }` (other gagne pour le reste).
 */
export function mergeQuestionPreservingAdminChoix<
  A extends QuestionLike,
  B extends QuestionLike,
>(adminCandidate: A | null | undefined, otherSource: B | null | undefined): A | B {
  if (!adminCandidate && !otherSource) {
    return {} as A;
  }
  if (!adminCandidate) return otherSource as B;
  if (!otherSource) return adminCandidate as A;

  if (hasAdminEdit(adminCandidate)) {
    // Admin a édité : son objet entier (énoncé + choix + _editedAt) gagne.
    // On n'utilise `otherSource` que pour remplir les champs absents côté admin.
    return {
      ...(otherSource as object),
      ...(adminCandidate as object),
      choix: resolveCorrectAnswers(adminCandidate, otherSource),
    } as A;
  }

  return {
    ...(adminCandidate as object),
    ...(otherSource as object),
    choix: resolveCorrectAnswers(adminCandidate, otherSource),
  } as B;
}
