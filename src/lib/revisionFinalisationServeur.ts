/**
 * Server-side atomic finalization of "corriger mes réponses fausses"
 * (RPC finaliser_revision_fausses) is prepared but NOT installed in production:
 * its score proof is incomplete for historical copies without a frozen snapshot.
 * While false, the learner screen keeps the currently published insertion path,
 * so a published bundle can never call an RPC the server does not provide.
 * Flip only in the same release that applies the reviewed server migration.
 */
export const REVISION_FINALISATION_SERVEUR_ACTIVE = false;
