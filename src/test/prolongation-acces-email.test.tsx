import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { construireMailProlongation, PROLONGATION_SUJET } from '../../supabase/functions/_shared/prolongation-email';
import { ReactiverPlateformeTab, dernierEnvoi } from '@/components/crm/apprenant-sections/ReactiverPlateformeTab';

const m = vi.hoisted(() => ({ rpc: vi.fn(), invoke: vi.fn(), ext: [] as any[], envois: [] as any[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: m.invoke }, rpc: m.rpc, from: (t: string) => {
  const rows = () => (t === 'crm_prolongation_emails' ? m.envois : m.ext);
  const c: any = { select: () => c, eq: () => c, order: () => c, single: async () => ({ data: m.ext[0], error: null }), then: (r: any) => Promise.resolve({ data: rows(), error: null }).then(r) };
  return c;
} } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const P = { debut: '2026-11-02', fin: '2026-12-02', fin_precedente: '2026-11-01' };
const wrap = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ReactiverPlateformeTab apprenantId="a" /></QueryClientProvider>);
beforeEach(() => {
  m.ext = []; m.envois = []; m.invoke.mockReset(); m.rpc.mockReset();
  m.rpc.mockImplementation(async (name: string, args: any) => {
    if (name === 'crm_preparer_reactivation') return { data: P, error: null };
    m.ext = [{ id: 'ext1', operation_id: args.p_operation, ...P, created_at: '2026-11-02T10:00:00Z' }];
    return { data: m.ext[0], error: null };
  });
});
const confirmer = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Réactiver pour un mois' }));
  const b = screen.getByRole('button', { name: 'Confirmer la réactivation' }); fireEvent.click(b); fireEvent.click(b);
};

describe('E-mail de prolongation', () => {
  it('contenu : objet, texte exigé, date réelle, lien, aucun mot de passe', () => {
    const { subject, html } = construireMailProlongation({ prenom: 'Nesar', fin: '2026-12-02' });
    expect(subject).toBe('Prolongation de votre accès à la formation');
    expect(html).toContain("Votre accès à la plateforme de formation a été prolongé d'un mois. Vous pouvez continuer à vous connecter avec votre compte habituel et vos identifiants actuels.");
    expect(html).toContain('02/12/2026');
    expect(html).toContain('/cours-public');
    expect(html).not.toMatch(/mot de passe|password|identifiants de connexion|commence aujourd/i);
  });
  it('1 clic (et double clic) : un seul mois ajouté et un seul envoi pour cette prolongation', async () => {
    m.invoke.mockResolvedValue({ data: { statut: 'envoye' }, error: null });
    wrap(); await confirmer();
    await waitFor(() => expect(m.invoke).toHaveBeenCalledTimes(1));
    expect(m.rpc.mock.calls.filter(c => c[0] === 'crm_reactiver_un_mois')).toHaveLength(1);
    expect(m.invoke).toHaveBeenCalledWith('send-prolongation-acces', { body: { extension_id: 'ext1' } });
  });
  it('échec d’envoi : état honnête puis renvoi sans rajouter de mois', async () => {
    m.invoke.mockResolvedValueOnce({ data: { statut: 'echec', error: 'Fournisseur indisponible' }, error: null });
    wrap(); await confirmer();
    await waitFor(() => expect(m.invoke).toHaveBeenCalledTimes(1));
    m.envois = [{ extension_id: 'ext1', statut: 'echec', erreur: 'Fournisseur indisponible', created_at: '2026-11-02T10:00:01Z' }];
    const renvoi = await screen.findByRole('button', { name: /Renvoyer l’e-mail/ }, { timeout: 3000 }).catch(async () => { wrapRefetch(); return screen.findByRole('button', { name: /Renvoyer l’e-mail/ }); });
    m.invoke.mockResolvedValueOnce({ data: { statut: 'envoye' }, error: null });
    fireEvent.click(renvoi);
    await waitFor(() => expect(m.invoke).toHaveBeenCalledTimes(2));
    expect(m.rpc.mock.calls.filter(c => c[0] === 'crm_reactiver_un_mois')).toHaveLength(1);
  });
  it('dernier statut : un envoi réussi prime sur un échec antérieur', () => {
    const e = dernierEnvoi([{ extension_id: 'x', statut: 'echec', erreur: 'a', created_at: '2026-11-02T11:00:00Z' }, { extension_id: 'x', statut: 'envoye', erreur: null, created_at: '2026-11-02T10:00:00Z' }], 'x');
    expect(e?.statut).toBe('envoye');
  });
  it('serveur : sans e-mail = échec, jamais de compte, mot de passe ni prolongation', () => {
    const src = readFileSync('supabase/functions/send-prolongation-acces/index.ts', 'utf8');
    expect(src).toContain('Aucune adresse e-mail valide');
    expect(src).not.toMatch(/createUser|updateUserById|generateLink|password|crm_reactiver_un_mois|crm_acces_extensions"\)\.insert|from\("apprenants"\)\.update/);
    expect(src).toMatch(/statut", "envoye"\)\.maybeSingle\(\)/); // déjà envoyé = pas de doublon
  });
});
function wrapRefetch() { /* le refetch suit l'envoi ; placeholder pour lisibilité */ }
