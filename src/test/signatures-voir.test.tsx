import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SignaturesRassembleesExport } from '@/components/crm/apprenant-sections/SignaturesRassembleesExport';
const mocks = vi.hoisted(() => ({ load: vi.fn(), role: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'admin' }, loading: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.role }) }) }) }) } }));
vi.mock('@/lib/signaturesRassemblees', () => ({ chargerSignaturesRassemblees: mocks.load, formaterCompteSignaturesPdf: () => null }));
vi.mock('@/lib/pdf/signatures-rassemblees', () => ({ generateSignaturesRassembleesPdf: () => ({ blob: new Blob(), fileName: 'signatures.pdf', pages: 1 }) }));
vi.mock('@/components/crm/apprenant-sections/EmargementPersonnaliseExport', () => ({ EmargementPersonnaliseExport: () => null }));
const row = { id: 'signature-originale', date: '2026-11-12', creneau: 'Matin', horaires: '09:00 - 12:00', activite: 'Formation présentielle', signedAt: '2026-11-12T08:00:00Z', signature: 'data:image/png;base64,AAAA', absent: false };
function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SignaturesRassembleesExport apprenant={{ id: 'dossier-exact', prenom: 'Test', nom: 'Fixture' }} /></QueryClientProvider>); }
beforeEach(() => { cleanup(); vi.clearAllMocks(); mocks.role.mockResolvedValue({ data: { role: 'admin' }, error: null }); mocks.load.mockResolvedValue([row]); });
describe('Consultation des signatures', () => {
  it('lit seulement le dossier demandé au clic, sans téléchargement', async () => {
    mount(); expect(mocks.load).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Voir — Toutes les signatures (PDF)' }));
    await screen.findByAltText('Signature du 2026-11-12 — Matin');
    expect(mocks.load).toHaveBeenCalledWith('dossier-exact', false);
  });
  it('utilise le périmètre session et pratique choisi', async () => {
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Voir — Signatures session + pratique (PDF)' }));
    await screen.findByAltText('Signature du 2026-11-12 — Matin');
    expect(mocks.load).toHaveBeenCalledWith('dossier-exact', true);
  });
  it('refuse la lecture sans rôle administrateur confirmé', async () => {
    mocks.role.mockResolvedValue({ data: null, error: null }); mount();
    fireEvent.click(screen.getByRole('button', { name: 'Voir — Toutes les signatures (PDF)' }));
    await waitFor(() => expect(screen.getByText('Lecture des signatures indisponible.')).toBeTruthy());
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it('ne transforme pas une erreur en absence de signature', async () => {
    mocks.load.mockRejectedValue(new Error('Lecture échouée')); mount();
    fireEvent.click(screen.getByRole('button', { name: 'Voir — Toutes les signatures (PDF)' }));
    await screen.findByText('Lecture des signatures indisponible.');
    expect(screen.queryByText('Aucune signature enregistrée.')).toBeNull();
  });
});
