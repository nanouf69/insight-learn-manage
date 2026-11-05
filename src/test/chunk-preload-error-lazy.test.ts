// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
vi.mock('sonner', () => ({ toast: { info: vi.fn() } }));
import { installChunkVersionGuard } from '@/lib/chunkVersionGuard';

/** Rejoue la logique de Vite (handlePreloadError) : rejet seulement si l'événement n'est pas annulé. */
function vitePreload(win: Window, err: Error) {
  return Promise.reject(err).catch((e) => {
    const ev = new Event('vite:preloadError', { cancelable: true });
    win.dispatchEvent(ev);
    if (!ev.defaultPrevented) throw e;
  });
}

describe('Chunk manquant et React.lazy', () => {
  it("l'import échoue en vraie erreur (jamais résolu à undefined)", async () => {
    installChunkVersionGuard(window);
    await expect(
      vitePreload(window, new Error('Failed to fetch dynamically imported module')),
    ).rejects.toThrow('Failed to fetch dynamically imported module');
  });
});
