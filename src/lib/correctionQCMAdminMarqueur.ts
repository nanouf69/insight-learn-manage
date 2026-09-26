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

/**
 * Points QRC lus depuis le details de la relecture unique (jamais depuis une
 * requête séparée par QRC, qui pourrait échouer silencieusement et compter 0).
 */
export function pointsQRCDepuisDetails(details: unknown, questionId: number): number {
  const d =
    details && typeof details === "object" && !Array.isArray(details)
      ? (details as Record<string, unknown>)
      : null;
  const corrections =
    d?.correctionsIA && typeof d.correctionsIA === "object" && !Array.isArray(d.correctionsIA)
      ? (d.correctionsIA as Record<string, unknown>)
      : null;
  const corr = corrections?.[String(questionId)];
  if (corr && typeof corr === "object" && "pointsObtenus" in (corr as Record<string, unknown>)) {
    return Number((corr as Record<string, unknown>).pointsObtenus) || 0;
  }
  return 0;
}
