/**
 * Hauteur utilisée pour adapter une slide PDF à l'écran.
 * - Plein écran : la zone a une taille fixe, on peut la mesurer.
 * - Sinon : la zone s'adapte au contenu (hauteur auto, max 80 % de l'écran) ;
 *   la mesurer créerait une boucle (slide plus grande → zone plus grande → …).
 *   On utilise donc 80 % de la hauteur d'écran, comme la limite CSS.
 */
export function hauteurDisponibleViewer(opts: {
  expanded: boolean;
  zoneMesuree: number;
  hauteurEcran: number;
}): number {
  if (opts.expanded) return opts.zoneMesuree > 0 ? opts.zoneMesuree : opts.hauteurEcran;
  return Math.round(opts.hauteurEcran * 0.8);
}
