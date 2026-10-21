/**
 * Détection d'un fichier de l'application devenu obsolète (ancien onglet après
 * une mise en ligne : le navigateur demande un « chunk » qui n'existe plus,
 * erreur 404 / ChunkLoadError).
 *
 * Comportement : JAMAIS de rechargement automatique (risque de perdre une
 * saisie ou un envoi en cours). On affiche une notification discrète avec un
 * bouton « Recharger » que l'utilisateur clique quand il veut. Le rechargement
 * est un cache-bust qui conserve l'URL et ne touche à AUCUNE donnée locale
 * (files de réponses, notes, pages en attente, session).
 */
import { toast } from 'sonner';

const MARQUEURS_CHUNK_OBSOLETE = [
  'Failed to fetch dynamically imported module',
  'ChunkLoadError',
  'error loading dynamically imported module',
  'Importing a module script failed',
];

/** Vrai si le message d'erreur correspond à un chunk devenu introuvable. */
export function estErreurChunkObsolete(message: unknown): boolean {
  if (typeof message !== 'string' || !message) return false;
  return MARQUEURS_CHUNK_OBSOLETE.some((m) => message.includes(m));
}

/** Rechargement cache-bust : URL conservée, aucun stockage effacé. */
export function rechargerVersionAJour(win: Pick<Window, 'location'> = window): void {
  try {
    const url = new URL(win.location.href);
    url.searchParams.set('_t', String(Date.now()));
    win.location.href = url.toString();
  } catch {
    win.location.reload();
  }
}

let dejaNotifie = false;

/** Affiche une seule fois la notification ; l'utilisateur décide du rechargement. */
export function notifierChunkObsolete(): void {
  if (dejaNotifie) return;
  dejaNotifie = true;
  toast.info('Une nouvelle version de l’application est disponible.', {
    description:
      'Rechargez quand vous avez terminé votre action en cours. Vos données sur cet appareil sont conservées.',
    duration: Infinity,
    action: {
      label: 'Recharger',
      onClick: () => rechargerVersionAJour(),
    },
  });
}

/** Installe les écouteurs globaux (idempotent). À appeler au démarrage. */
export function installChunkVersionGuard(win: Window = window): void {
  // Vite émet cet événement quand un import dynamique échoue (chunk 404).
  win.addEventListener('vite:preloadError', (event) => {
    event.preventDefault(); // empêche le rejet non géré
    notifierChunkObsolete();
  });
  // Filet de sécurité pour les navigateurs/bundles sans événement dédié.
  win.addEventListener('unhandledrejection', (event) => {
    const raison = event.reason;
    const message =
      typeof raison === 'string' ? raison : raison instanceof Error ? raison.message : '';
    if (estErreurChunkObsolete(message)) {
      event.preventDefault();
      notifierChunkObsolete();
    }
  });
}
