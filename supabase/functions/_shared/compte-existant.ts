// Recherche d'un compte existant par e-mail + décision de réutilisation.
// Fonctions pures (testées par src/test/auto-send-credentials-compte-existant.test.ts).

export type AuthUserLite = { id: string; email?: string | null };
export type ListPage = (page: number, perPage: number) => Promise<AuthUserLite[]>;

/** Parcourt TOUTES les pages de comptes ; comparaison exacte, insensible à la casse. */
export async function trouverCompteParEmail(email: string, listPage: ListPage, perPage = 1000): Promise<AuthUserLite | null> {
  const cible = email.trim().toLowerCase();
  for (let page = 1; page < 1000; page++) {
    const users = await listPage(page, perPage);
    const hit = users.find((u) => (u.email ?? "").trim().toLowerCase() === cible);
    if (hit) return hit;
    if (users.length < perPage) return null;
  }
  return null;
}

export type DecisionCompte =
  | { action: "reutiliser"; authUserId: string }
  | { action: "bloquer"; raison: string };

/** Compte lié à un autre dossier → jamais de rattachement automatique (réinscription). */
export function deciderReutilisation(
  compte: AuthUserLite | null,
  apprenantId: string,
  dossiersLies: { id: string; created_at?: string | null }[],
): DecisionCompte {
  if (!compte) return { action: "bloquer", raison: "Utilisateur existant introuvable" };
  const autre = dossiersLies.find((d) => d.id !== apprenantId);
  if (autre) {
    const date = autre.created_at ? new Date(autre.created_at).toLocaleDateString("fr-FR") : "?";
    return { action: "bloquer", raison: `Réinscription : compte déjà lié au dossier du ${date} — décision Admin requise` };
  }
  return { action: "reutiliser", authUserId: compte.id };
}
