/** Ajoute le marqueur de correction QCM admin sans toucher aux autres clés de details. */
export function ajouterMarqueurCorrectionQCMAdmin(
  details: unknown,
  par: string | null,
  correctedAt: string,
): Record<string, unknown> {
  const base =
    details && typeof details === "object" && !Array.isArray(details)
      ? (details as Record<string, unknown>)
      : {};
  return {
    ...base,
    correctionQCMAdmin: { manuel: true, validatedByAdmin: true, correctedAt, par },
  };
}

export type RelectureDetails = { ok: true; details: unknown } | { ok: false };

/**
 * Relit details de la fiche. Échec (erreur, réseau, exception) ou fiche absente
 * → { ok: false } : l'appelant doit annuler toute écriture.
 */
export async function relireDetailsFiche(
  lire: () => PromiseLike<{ data: { details: unknown } | null; error: unknown }>,
): Promise<RelectureDetails> {
  try {
    const { data, error } = await lire();
    if (error || !data) return { ok: false };
    return { ok: true, details: data.details };
  } catch {
    return { ok: false };
  }
}
