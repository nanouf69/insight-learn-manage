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
