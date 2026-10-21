/**
 * Progression affichée d'un module : seules les pages ACTUELLES (index 0..total-1)
 * comptent, jamais plus de 100 %. Les pages « vues » d'une ancienne mise en page
 * restent conservées telles quelles (aucune suppression), elles ne sont simplement
 * plus comptées au-delà du contenu courant.
 */
export function pagesVuesActuelles(vues: Iterable<number>, totalPages: number): number {
  if (!(totalPages > 0)) return 0;
  const set = new Set<number>();
  for (const i of vues) if (Number.isInteger(i) && i >= 0 && i < totalPages) set.add(i);
  return set.size;
}

export function pourcentagePagesActuelles(vues: Iterable<number>, totalPages: number): number {
  if (!(totalPages > 0)) return 0;
  return Math.min(100, Math.round((pagesVuesActuelles(vues, totalPages) / totalPages) * 100));
}
