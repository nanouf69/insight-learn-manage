/** Demande d'ouverture d'un jeu du registre, conservée si le jeu n'est pas encore chargé (lazy). */
let enAttente: string | null = null;
const auditeurs = new Set<(id: string) => void>();
export function demanderJeu(id: string) {
  if (auditeurs.size === 0) { enAttente = id; return; }
  auditeurs.forEach((f) => f(id));
}
/** Abonnement ; rejoue immédiatement une demande faite avant le montage. */
export function ecouterDemandeJeu(f: (id: string) => void) {
  auditeurs.add(f);
  if (enAttente) { const id = enAttente; enAttente = null; f(id); }
  return () => { auditeurs.delete(f); };
}
