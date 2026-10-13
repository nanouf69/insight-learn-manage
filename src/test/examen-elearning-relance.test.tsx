import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TauxElearningCell } from '@/components/examens/TauxElearningCell';
import { estCandidatElearning, mailRelanceElearning, texteMailVersHtml } from '@/lib/examenElearningRelance';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), hook: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock('@/hooks/useCandidatModules', () => ({ useCandidatModules: mocks.hook }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'admin-fictif' } }) }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error, info: mocks.info } }));

const candidat = { id: 'fictif', prenom: 'Test', email: 'test@example.com', type_apprenant: 'vtc-e' };
function mount(props = candidat) {
  render(<QueryClientProvider client={new QueryClient()}><TauxElearningCell candidat={props} /></QueryClientProvider>);
}

beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  mocks.hook.mockReturnValue({ data: { etat: 'ok', total: 12, termines: 9, restants: [{ id: 2 }, { id: 4 }, { id: 8 }], seulementPratique: false }, isLoading: false });
  mocks.invoke.mockResolvedValue({ data: { success: true }, error: null });
});

describe('Taux e-learning et relance manuelle — données fictives, réseau simulé', () => {
  it('reconnaît les parcours e-learning sans inclure les présentiels', () => {
    for (const type of ['vtc-e', 'taxi-e', 'ta-e', 'va-e', 'vtc-e-presentiel']) expect(estCandidatElearning({ id: 'x', type_apprenant: type })).toBe(true);
    for (const type of ['vtc', 'taxi', 'ta', 'va']) expect(estCandidatElearning({ id: 'x', type_apprenant: type })).toBe(false);
    expect(estCandidatElearning({ id: 'x', modalite_formation: 'elearning_asynchrone' })).toBe(true);
  });
  it('affiche les modules sans heures ni envoi à l’affichage', () => {
    mount(); expect(screen.getByText('9 / 12 modules terminés')).toBeInTheDocument();
    expect(screen.getByText('3 à terminer')).toBeInTheDocument(); expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('ne charge pas les données de taux des présentiels', () => {
    mount({ ...candidat, type_apprenant: 'taxi' });
    expect(mocks.hook).toHaveBeenCalledWith(undefined);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('préparer puis annuler ne déclenche aucun envoi', () => {
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Préparer le mail de relance e-learning' }));
    expect(screen.getByLabelText('Message')).toHaveValue(mailRelanceElearning('Test').body);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' })); expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('envoie uniquement après confirmation, avec le texte modifié et échappé', async () => {
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Préparer le mail de relance e-learning' }));
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Bonjour <test>\nRappel' } });
    expect(mocks.invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et envoyer' }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Mail envoyé'));
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledWith('sync-outlook-emails', { body: expect.objectContaining({ apprenantId: 'fictif', to: 'test@example.com', body: 'Bonjour &lt;test&gt;<br>Rappel' }) });
  });
  it('conserve le brouillon ouvert si le serveur refuse', async () => {
    mocks.invoke.mockResolvedValue({ data: { success: false, error: 'Refus simulé' }, error: null });
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Préparer le mail de relance e-learning' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et envoyer' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Refus simulé'));
    expect(screen.getByLabelText('Message')).toBeInTheDocument(); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('ne confond pas un doublon ignoré avec un nouvel envoi', async () => {
    mocks.invoke.mockResolvedValue({ data: { success: true, skipped: true }, error: null });
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Préparer le mail de relance e-learning' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et envoyer' }));
    await waitFor(() => expect(mocks.info).toHaveBeenCalled()); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('désactive les adresses invalides et signale une lecture impossible', () => {
    mocks.hook.mockReturnValue({ isError: true });
    mount({ ...candidat, email: 'rrt' }); expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Modules indisponibles')).toBeInTheDocument();
  });
  it('ne relance pas les modules déjà tous terminés', () => {
    mocks.hook.mockReturnValue({ data: { etat: 'ok', total: 12, termines: 12, restants: [] } });
    mount(); expect(screen.getByText('12 / 12 modules terminés')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled(); expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('le message conserve les obligations et un risque conditionnel, pas une sanction certaine', () => {
    const { body } = mailRelanceElearning();
    expect(body).toContain("même après la réussite de l'examen"); expect(body).toContain('tous les modules');
    expect(body).toContain("Vous n'avez pas encore terminé"); expect(body).not.toMatch(/connexion.*faible|heures de formation/);
    expect(body).toContain('selon votre financement'); expect(body).toContain('France Travail');
    expect(texteMailVersHtml('<>&\n')).toBe('&lt;&gt;&amp;<br>');
  });
});