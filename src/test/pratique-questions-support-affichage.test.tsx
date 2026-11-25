import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import PratiqueQuestionsSupport from '@/components/cours-en-ligne/PratiqueQuestionsSupport';

const download = vi.fn();
const getSession = vi.fn();
const unsubscribe = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSession(...args),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe } } }),
    },
    storage: {
      from: (bucket: string) => ({
        download: (path: string) => download(bucket, path),
      }),
    },
  },
}));

describe('Questions pratiques : affichage immédiat', () => {
  beforeEach(() => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'compte-fictif' } } } });
    download.mockResolvedValue({ data: new Blob(['image fictive'], { type: 'image/jpeg' }), error: null });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:questions-pratique') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each([
    { moduleId: 6, titre: 'TAXI', page: 'cours-images/pratique-taxi-20261104/page-01.jpg' },
    { moduleId: 8, titre: 'VTC', page: 'cours-images/pratique-vtc-20261104/page-01.jpg' },
  ])('$titre : la première page est intégrée sans clic', async ({ moduleId, titre, page }) => {
    render(<PratiqueQuestionsSupport moduleId={moduleId} coursId={2} />);

    expect(screen.getByRole('button', { name: new RegExp(`Questions examen pratique ${titre}.*Masquer le document`) })).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByRole('img', { name: `Questions examen pratique ${titre} — Page 1` })).toHaveAttribute('src', 'blob:questions-pratique');
    expect(download).toHaveBeenCalledWith('cours-fichiers', page);
    expect(screen.getByRole('status')).toHaveTextContent('Page 1 / 20');
  });
});
