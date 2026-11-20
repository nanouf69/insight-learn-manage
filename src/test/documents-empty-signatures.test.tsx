// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentsCompletes } from '@/components/crm/apprenant-sections/DocumentsCompletes';

const fixture = vi.hoisted(() => ({ documentsError: false, missing: 2 }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    const name = queryKey[0];
    const data = name === 'apprenant-documents-completes' ? []
      : name === 'apprenant-signatures-manquantes' ? {
        attendus: Array.from({ length: fixture.missing }, (_, i) => ({ date: '2026-11-17', creneau: i ? 'Après-midi' : 'Matin', source: 'Théorie — inscription de session', etat: 'manquante' })),
        anomalies: [], horsSession: [], aVerifier: [],
      }
      : name === 'apprenant-bilan-signatures-edof' ? { objectifTotal: 2, total: 0, objectifTheorie: 2, objectifPratique: 0, theorie: 0, pratique: 0, filiere: 'VTC', horsPlanning: [], planningIncomplet: false }
      : undefined;
    return { data, isLoading: false, isError: name === 'apprenant-documents-completes' && fixture.documentsError };
  },
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  channel: () => { const channel = { on: () => channel, subscribe: vi.fn() }; return channel; }, removeChannel: vi.fn(),
} }));
vi.mock('@/components/crm/TauxPresenceSessionsCard', () => ({ chargerTauxPresenceHeures: vi.fn() }));
vi.mock('@/components/crm/apprenant-sections/SignaturesPapierDossier', () => ({ SignaturesPapierDossier: () => null }));
vi.mock('@/components/crm/apprenant-sections/CompteurHeuresNonSignees', () => ({ CompteurHeuresNonSignees: () => null }));
vi.mock('@/components/crm/apprenant-sections/PresencesManuellesDetail', () => ({ PresencesManuellesDetail: () => null }));
vi.mock('@/components/crm/apprenant-sections/SignaturesRassembleesExport', () => ({ SignaturesRassembleesExport: () => null }));
afterEach(() => { cleanup(); fixture.documentsError = false; fixture.missing = 2; });
describe('Fiche vide : preuves indépendantes', () => {
  it.each(['continue-vtc', 'continue-taxi', 'vtc', 'taxi', 'ta', 'va', 'vtc-e'])('conserve les deux créneaux manquants sans documents pour %s', type => {
    render(<DocumentsCompletes apprenant={{ id: 'fictif', nom: 'Test', type_apprenant: type }} />);
    const list = screen.getByTestId('signatures-manquantes');
    expect(list.querySelectorAll('li')).toHaveLength(2);
  });
  it('une erreur documents ne masque pas les deux créneaux prouvés manquants', () => {
    fixture.documentsError = true;
    render(<DocumentsCompletes apprenant={{ id: 'fictif', nom: 'Test' }} />);
    expect(screen.getByTestId('signatures-manquantes').querySelectorAll('li')).toHaveLength(2);
  });
});