import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CONTRACT_FIELD_GROUPS, addDays, parisDay, type TrainingContract } from '@/lib/contratFormation/model';
import { ContratFormationSection } from '@/components/crm/apprenant-sections/ContratFormationSection';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'admin-fictif' } }, error: null }) },
  rpc: async () => ({ data: true, error: null }),
  from: () => ({ select: () => ({ eq: () => ({ order: () => ({ range: async () => ({ data: [], error: null }) }) }) }) }),
  functions: { invoke },
} }));

function fixture(): TrainingContract {
  const today = parisDay(new Date());
  const start = addDays(today, 30), end = addDays(today, 31);
  const fields = Object.fromEntries(CONTRACT_FIELD_GROUPS.flatMap(g => g.fields.map(([k]) => [k, 'Référence fictive vérifiée'])));
  Object.assign(fields, { learnerEmail: 'fictif@example.invalid', start, end, totalHours: '14', presenceHours: '14', distanceHours: '0', practiceHours: '0', price: '299', priceHT: '299', vatRate: '0', vatAmount: '0', vat: 'Article 261 CGI fictif', headcount: '16', conclusionMode: 'sur place' });
  return { reference: 'TEST-SANS-ENVOI', learnerId: 'fictif', sessionId: '', pathway: 'formation-continue-taxi', funding: 'personnel', fields, activities: [{ id: 'fc', title: 'FC TAXI', activities: 'Programme fictif', modality: 'Présentiel', hours: '14', evaluation: 'Évaluation fictive', value: '299' }], payments: [ { amount: '89.7', date: start, milestone: 'Début' }, { amount: '0', date: start, milestone: 'Étape' }, { amount: '0', date: end, milestone: 'Étape' }, { amount: '209.3', date: end, milestone: 'Fin' }], verified: true, signedAt: null, concludedAt: null, pratique: { incluse: 'non', heures: '0', mode: '', effectifPrevu: '', effectifMax: '', conduiteIndividuelle: '' } };
}
describe('Préparation du mail sans envoi', () => {
  it('le document complet permet un aperçu sans transport ; une modification bloque la confirmation', async () => {
    const contract = fixture();
    const { rerender } = render(<ContratFormationSection apprenant={{ id: 'fictif' }} value={contract} onChange={() => {}} permettreEnvoi />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Préparer le mail avec le contrat à signer' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Préparer le mail avec le contrat à signer' }));
    expect(invoke).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirmer l’envoi au candidat' })).toBeEnabled();
    rerender(<ContratFormationSection apprenant={{ id: 'fictif' }} value={{ ...contract, fields: { ...contract.fields, price: '300' } }} onChange={() => {}} permettreEnvoi />);
    expect(screen.getByRole('button', { name: 'Confirmer l’envoi au candidat' })).toBeDisabled();
    expect(invoke).not.toHaveBeenCalled();
  });
});