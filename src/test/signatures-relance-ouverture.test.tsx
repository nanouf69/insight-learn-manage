// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SignaturesManquantesTab } from '@/components/crm/apprenant-sections/SignaturesManquantesTab';
import { chargerSignaturesManquantes } from '@/lib/signaturesManquantes';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/lib/signaturesManquantes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/signaturesManquantes')>();
  return {
    ...actual,
    chargerSignaturesManquantes: vi.fn(),
    chargerClassificationSignatures: vi.fn().mockResolvedValue({ anomalies: [], horsSession: [] }),
    dateDuJourParis: () => '2026-11-06',
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const manquante = { date: '2026-11-05', creneau: 'Matin', source: 'Pratique TAXI', etat: 'manquante' as const };

function afficher(demandeOuverture = 1, email: string | null = 'fictif@example.fr') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SignaturesManquantesTab
        apprenant={{ id: 'apprenant-fictif', prenom: 'Test', nom: 'Fictif', email }}
        demandeOuverture={demandeOuverture}
      />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Ouverture directe de la relance de signatures', () => {
  it('ouvre l’aperçu demandé sans envoyer de mail', async () => {
    vi.mocked(chargerSignaturesManquantes).mockResolvedValue([manquante]);
    afficher();

    expect(await screen.findByRole('heading', { name: 'Aperçu du mail' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vérifier avant envoi' })).toBeInTheDocument();
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('ne rouvre pas un aperçu fermé sans nouvelle demande', async () => {
    vi.mocked(chargerSignaturesManquantes).mockResolvedValue([manquante]);
    afficher();
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Aperçu du mail' })).not.toBeInTheDocument());
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('explique qu’il n’y a rien à envoyer au lieu de laisser le clic sans réponse', async () => {
    vi.mocked(chargerSignaturesManquantes).mockResolvedValue([]);
    afficher();

    expect(await screen.findByRole('status')).toHaveTextContent('Aucune signature à relancer.');
    expect(screen.queryByRole('heading', { name: 'Aperçu du mail' })).not.toBeInTheDocument();
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('signale une adresse manquante sans préparer ni envoyer de mail', async () => {
    vi.mocked(chargerSignaturesManquantes).mockResolvedValue([manquante]);
    afficher(1, null);

    expect(await screen.findByRole('status')).toHaveTextContent('Adresse email manquante');
    expect(screen.queryByRole('heading', { name: 'Aperçu du mail' })).not.toBeInTheDocument();
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
});
