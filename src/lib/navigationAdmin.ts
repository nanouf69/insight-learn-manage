export interface DestinationAdmin {
  page: string;
  apprenantId: string | null;
}

export function memeDestination(a: DestinationAdmin, b: DestinationAdmin): boolean {
  return a.page === b.page && a.apprenantId === b.apprenantId;
}

export function empilerDestinationPrecedente(
  historique: DestinationAdmin[],
  courante: DestinationAdmin,
  suivante: DestinationAdmin,
): DestinationAdmin[] {
  if (memeDestination(courante, suivante)) return historique;
  return [...historique, courante];
}

export function retirerDestinationPrecedente(
  historique: DestinationAdmin[],
): { destination: DestinationAdmin; historique: DestinationAdmin[] } | null {
  const destination = historique.at(-1);
  return destination ? { destination, historique: historique.slice(0, -1) } : null;
}
