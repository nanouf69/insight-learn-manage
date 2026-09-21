/**
 * VUE APPRENANT (aperçu admin / formateur) = LECTURE SEULE ABSOLUE.
 *
 * Règle centrale (pas seulement de l'UI) : lorsqu'un admin ou un formateur
 * consulte le dossier d'un apprenant, AUCUNE écriture ne doit partir au nom de
 * cet apprenant, même si une fonction d'écriture est appelée par erreur.
 *
 * Périmètre couvert : réponses, tentatives, notes/résultats, progression de
 * module, chronomètres d'examen, temps par question / présence / activité,
 * documents et bilans automatiques, suivi des heures (date d'examen théorique).
 *
 * ⚠️ Ce verrou s'active UNIQUEMENT dans l'aperçu (mode `embedded`). Un véritable
 * apprenant connecté sur son propre compte n'est jamais concerné : toutes ses
 * sauvegardes fonctionnent normalement.
 *
 * Ce module ne modifie, ne supprime et ne recalcule aucune donnée existante :
 * il se contente de refuser des écritures avant qu'elles ne partent.
 */

let previewReadOnly = false;
const blockedWrites: string[] = [];

export function setLearnerPreviewReadOnly(value: boolean): void {
  previewReadOnly = value === true;
}

export function isLearnerPreviewReadOnly(): boolean {
  return previewReadOnly;
}

/**
 * À appeler juste avant toute écriture liée à un apprenant.
 * Retourne `true` si l'écriture doit être ABANDONNÉE (consultation admin).
 */
export function blockLearnerWrite(operation: string): boolean {
  if (!previewReadOnly) return false;
  blockedWrites.push(`${new Date().toISOString()} ${operation}`);
  if (blockedWrites.length > 200) blockedWrites.splice(0, blockedWrites.length - 200);
  if (typeof console !== "undefined") {
    console.warn(`[Vue apprenant] lecture seule : écriture refusée (${operation})`);
  }
  return true;
}

/** Journal de contrôle (diagnostic) des écritures refusées en consultation. */
export function getBlockedLearnerWrites(): string[] {
  return [...blockedWrites];
}

export function resetBlockedLearnerWrites(): void {
  blockedWrites.length = 0;
}
