// Plafond mensuel commun (examens blancs + Contrôle de connaissances).
// Réservation AVANT chaque appel payant, sur une borne haute ; règlement au coût
// mesuré. Prix en crédits/jeton du modèle utilisé (catalogue de la passerelle, 30/10/2026).
export const PRIX_CREDITS = { "google/gemini-3.8-flash": { entree: 0.000003, sortie: 0.000015 } } as const;
export const SORTIE_MAX_JETONS = 4096;

/** Borne haute : ~1 jeton pour 2 caractères en entrée (prudent) + sortie plafonnée. */
export function creditsMax(modele: keyof typeof PRIX_CREDITS, caracteresEntree: number): number {
  const p = PRIX_CREDITS[modele];
  return Math.ceil(caracteresEntree / 2 + 200) * p.entree + SORTIE_MAX_JETONS * p.sortie;
}

export function creditsReels(modele: keyof typeof PRIX_CREDITS, usage: { inputTokens?: number; outputTokens?: number } | null | undefined): number | null {
  if (!usage || !Number.isFinite(usage.inputTokens) || !Number.isFinite(usage.outputTokens)) return null;
  const p = PRIX_CREDITS[modele];
  return (usage.inputTokens as number) * p.entree + (usage.outputTokens as number) * p.sortie;
}

/** Début du mois civil suivant (Europe/Paris), approximé à minuit UTC du 1er + 1 h de marge. */
export function debutMoisSuivant(maintenant = new Date()): Date {
  const paris = new Date(maintenant.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  return new Date(Date.UTC(paris.getFullYear(), paris.getMonth() + 1, 1, 1, 0, 0));
}
