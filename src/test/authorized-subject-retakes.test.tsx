import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const m = vi.hoisted(() => ({ grants: [] as unknown[], receipts: [] as unknown[], start: vi.fn(), read: vi.fn(), authorize: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => ({ select: () => ({ eq: async () => ({ data: table === 'exam_subject_reset_authorizations' ? m.grants : m.receipts, error: null }) }) }) } }));
vi.mock('@/lib/examSubjectRetake', () => ({ startSubjectRetake: m.start }));
vi.mock('@/lib/adminSubjectReset', () => ({ readSubjectResetContext: m.read, authorizeSubjectReset: m.authorize }));
vi.mock('@/components/cours-en-ligne/useLiveExamens', () => ({ useLiveExamens: () => ({ examens: [{ id: 'EB3', titre: 'Examen Blanc 3 VTC', matieres: [{ id: 't3p', nom: 'A T3P' }] }] }) }));
import { AuthorizedSubjectRetakes } from '@/components/cours-en-ligne/AuthorizedSubjectRetakes';
import { ResetMatiereAdminButton } from '@/components/crm/apprenant-sections/ResetMatiereAdminButton';
afterEach(() => { cleanup(); vi.resetAllMocks(); m.grants = []; m.receipts = []; });
const grant = { operation_id: 'grant-fictif', exam_id: 'EB3', matiere_id: 't3p', source_exercice_id: 'EB3__t3p', source_attempt_id: 'ancienne-copie' };
function learner(onStarted = vi.fn()) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthorizedSubjectRetakes account="fictif" owner="proprietaire-fictif" onStarted={onStarted} /></QueryClientProvider>);
}
describe('Admin grant then learner-only start', () => {
  it('unused grant is visible and enabled without creating an attempt before the click', async () => {
    m.grants = [grant]; learner();
    expect(await screen.findByRole('button', { name: 'Refaire la matière' })).toBeEnabled();
    expect(screen.getByText(/Examen Blanc 3 VTC · A T3P/)).toBeTruthy();
    expect(m.start).not.toHaveBeenCalled();
  });
  it.each(['ancien', 'v2'])('admin acknowledgment, close and learner click start only the %s subject', async engine => {
    const ctx = { apprenant_id: 'fictif', exam_id: 'EB3', matiere_id: 't3p', filiere: 'vtc', learner_name: 'Élève FICTIF', status: 'en_attente', source_result_id: null };
    m.read.mockResolvedValue(ctx);
    m.authorize.mockImplementation(async () => { m.grants = [grant]; return { ...ctx, authorization_id: grant.operation_id }; });
    const admin = render(<ResetMatiereAdminButton target={{ apprenantId: 'fictif', prenom: 'Élève', nom: 'FICTIF', examId: 'EB3', examLabel: 'EB3 VTC', filiere: 'vtc', matiereId: 't3p', matiereNom: 'A T3P' }} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmer cette matière' }));
    await screen.findByRole('button', { name: 'Fermer' });
    expect(m.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' })); admin.unmount();
    const onStarted = vi.fn(); learner(onStarted);
    const button = await screen.findByRole('button', { name: 'Refaire la matière' });
    expect(m.start).not.toHaveBeenCalled();
    m.start.mockResolvedValue({ exam_id: 'EB3', matiere_id: 't3p', moteur: engine, exercice_id: 'EB3__t3p__t2', tentative: 2, attempt_id: engine === 'v2' ? 'nouvelle-copie' : null });
    fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(onStarted).toHaveBeenCalledOnce());
    expect(m.start).toHaveBeenCalledOnce();
    expect(m.start.mock.calls[0][0]).toMatchObject({ account: 'fictif', exam: 'EB3', subject: 't3p', sourceExercise: 'EB3__t3p', sourceAttempt: 'ancienne-copie' });
    expect(onStarted.mock.calls[0][0]).not.toHaveProperty('score');
  });
  it('consumed authorization never offers a duplicate start', async () => {
    m.grants = [grant]; m.receipts = [{ authorization_id: grant.operation_id }]; learner();
    await waitFor(() => expect(document.querySelector('[aria-label="Matières autorisées à refaire"]')).toBeNull());
    expect(m.start).not.toHaveBeenCalled();
  });
});