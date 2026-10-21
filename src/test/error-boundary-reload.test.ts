// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { estErreurChunkObsolete, rechargerVersionAJour } from '@/lib/chunkVersionGuard';

/**
 * Règle métier : le rechargement de secours (ErrorBoundary / chunk obsolète)
 * ne doit JAMAIS effacer de donnée persistante — files de réponses, notes,
 * pages en attente, session, clés inconnues — et doit conserver l'URL.
 */
describe('Rechargement sans effacement', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('conserve toutes les clés locales, connues ou inconnues, après rechargement', () => {
    localStorage.setItem('answer_save_queue_v1', '[{"id":"a"}]');
    localStorage.setItem('quiz_result_save_queue_v1', '[{"id":"q"}]');
    localStorage.setItem('module_pages_pending_v1:owner:app:3', '[{"id":"p"}]');
    localStorage.setItem('answer_write_seq_v1', '42');
    localStorage.setItem('sb-projet-auth-token', 'session');
    localStorage.setItem('cle_inconnue_future', 'donnée');
    sessionStorage.setItem('brouillon', 'x');

    const fakeLocation = {
      href: 'https://gestion.ftransport.fr/cours?module=3&exo=404',
      reload: () => {},
    };
    rechargerVersionAJour({ location: fakeLocation } as unknown as Window);

    // Aucune clé n'a été effacée par le rechargement.
    expect(localStorage.getItem('answer_save_queue_v1')).toBe('[{"id":"a"}]');
    expect(localStorage.getItem('quiz_result_save_queue_v1')).toBe('[{"id":"q"}]');
    expect(localStorage.getItem('module_pages_pending_v1:owner:app:3')).toBe('[{"id":"p"}]');
    expect(localStorage.getItem('answer_write_seq_v1')).toBe('42');
    expect(localStorage.getItem('sb-projet-auth-token')).toBe('session');
    expect(localStorage.getItem('cle_inconnue_future')).toBe('donnée');
    expect(sessionStorage.getItem('brouillon')).toBe('x');
  });

  it('conserve les paramètres existants de l’URL et ajoute le cache-bust', () => {
    const fakeLocation = {
      href: 'https://gestion.ftransport.fr/cours?module=3&exo=404',
      reload: () => {},
    };
    rechargerVersionAJour({ location: fakeLocation } as unknown as Window);
    const url = new URL(fakeLocation.href);
    expect(url.pathname).toBe('/cours');
    expect(url.searchParams.get('module')).toBe('3');
    expect(url.searchParams.get('exo')).toBe('404');
    expect(url.searchParams.get('_t')).toMatch(/^\d+$/);
  });
});

describe('Détection chunk obsolète', () => {
  it('reconnaît les erreurs de chunk 404 des principaux navigateurs', () => {
    expect(
      estErreurChunkObsolete(
        'Failed to fetch dynamically imported module: https://x/assets/JeuxCartesLyon-Cv1zqxPA.js',
      ),
    ).toBe(true);
    expect(estErreurChunkObsolete('ChunkLoadError: Loading chunk 123 failed.')).toBe(true);
    expect(
      estErreurChunkObsolete('Importing a module script failed'),
    ).toBe(true);
  });

  it('ignore les erreurs sans rapport (pas de fausse notification)', () => {
    expect(estErreurChunkObsolete('NetworkError when attempting to fetch resource.')).toBe(false);
    expect(estErreurChunkObsolete('JWT expired')).toBe(false);
    expect(estErreurChunkObsolete('')).toBe(false);
    expect(estErreurChunkObsolete(null)).toBe(false);
    expect(estErreurChunkObsolete(undefined)).toBe(false);
  });
});
