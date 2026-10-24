// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ call: vi.fn(), save: vi.fn(), pdf: vi.fn(), upload: vi.fn(), update: vi.fn(), notify: vi.fn() }));
vi.mock('@/lib/onboardingInvitation', () => ({ callOnboardingInvitation: m.call }));
vi.mock('@/lib/savePublicFormDocument', () => ({ savePublicFormDocument: m.save }));
vi.mock('@/lib/sendAdminNotification', () => ({ sendAdminNotification: m.notify }));
vi.mock('@/lib/documentUpload', () => ({ uploadInscriptionDocument: m.upload }));
vi.mock('@/lib/pdf/recapitulatif-inscription', () => ({ generateRecapitulatifPDF: m.pdf }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ update: (v: unknown) => { m.update(v); return { eq: async () => ({ error: null }) }; } }) } }));
vi.mock('@/pages/onboarding/OnboardingLayout', () => ({ OnboardingLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/onboarding/SignaturePad', () => ({ SignaturePad: ({ onChange }: any) => <button onClick={() => onChange('signature-fictive')}>Signer fictivement</button> }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn(), Link: ({ children }: any) => <span>{children}</span> }));
import Step12 from '@/pages/onboarding/steps/Step12';
const dossier = { id: 'fictif', type_apprenant: 'taxi-e', date_debut_cours_en_ligne: '2026-11-03', date_fin_cours_en_ligne: '2027-03-31' };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  for (const [k, v] of Object.entries({ apprenant_id: 'fictif', session_token: 'jeton-fictif', identifiant_cma: 'fictif', mot_de_passe_cma: 'fictif' })) localStorage.setItem(`onboarding_${k}`, v);
  m.call.mockResolvedValue({ dossier }); m.pdf.mockReturnValue(new Blob(['fictif'])); m.upload.mockResolvedValue({ success: true }); m.save.mockResolvedValue(true);
});
afterEach(cleanup);
it('finalise seulement après les deux engagements et conserve la preuve dans dossier et PDF', async () => {
  render(<Step12 />);
  await waitFor(() => expect(m.call).toHaveBeenCalledWith({ action: 'access_dates', apprenant_id: 'fictif', session_token: 'jeton-fictif' }));
  await screen.findByRole('checkbox', { name: /Si vous n’avez pas reçu/ });
  fireEvent.click(screen.getByRole('button', { name: 'Signer fictivement' }));
  fireEvent.click(screen.getByRole('checkbox', { name: /parcours pour devenir/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /casier judiciaire/ }));
  const envoyer = screen.getByRole('button', { name: 'Confirmer et envoyer mon dossier' });
  expect(envoyer).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: /Si vous n’avez pas reçu/ })); expect(envoyer).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: /Je m’engage à être présent/ })); expect(envoyer).toBeEnabled();
  fireEvent.click(envoyer);
  await waitFor(() => expect(m.save).toHaveBeenCalled());
  const preuve = m.save.mock.calls[0][0].donnees.engagements_elearning;
  expect(preuve).toMatchObject({ apprenant_id: 'fictif', date_debut_acces: '2026-11-03', date_fin_acces: '2027-03-31', consigne_acces_confirmee: true, engagement_pratique_confirme: true });
  expect(m.pdf.mock.calls[0][0].engagementsElearning).toEqual(preuve);
  expect(m.update.mock.calls[0][0]).not.toHaveProperty('date_debut_cours_en_ligne');
});
it('une lecture échouée bloque la finalisation sans présenter une fausse date', async () => {
  m.call.mockRejectedValue(new Error('Lecture indisponible')); render(<Step12 />);
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Confirmer et envoyer mon dossier' })).toBeDisabled();
  expect(m.save).not.toHaveBeenCalled(); expect(m.pdf).not.toHaveBeenCalled();
});