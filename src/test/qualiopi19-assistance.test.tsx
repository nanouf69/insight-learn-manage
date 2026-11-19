import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({ fail: false, records: [] as Array<Record<string, unknown>>, inserts: [] as Array<Record<string, unknown>> }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => {
    const query: any = {
      select: () => query, eq: () => query,
      order: async () => ({ data: fake.records, error: null }),
      insert: async (row: Record<string, unknown>) => { fake.inserts.push(row); if (!fake.fail) fake.records.push({ ...row, id: 'fictional-question', status: 'open', created_at: '2026-11-19T17:10:00Z', reponse: null }); return { error: fake.fail ? { code: '42501' } : null }; },
      update: () => query, then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }),
    };
    return query;
  },
  channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; }, removeChannel: vi.fn(),
} }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { ApprenantChatWidget } from '@/components/chat/ApprenantChatWidget';
import { toast } from 'sonner';

beforeEach(() => { fake.fail = false; fake.records = []; fake.inserts = []; vi.clearAllMocks(); });
afterEach(cleanup);
describe('Qualiopi 19 — assistance réelle, transport fictif sans réseau', () => {
  it('enregistre uniquement le dossier fictif affiché puis relit sa demande', async () => {
    render(<ApprenantChatWidget apprenantId="fictional-learner" apprenantNom="TEST FICTIF" />);
    fireEvent.click(screen.getByRole('button', { name: 'Poser une question' }));
    fireEvent.change(screen.getByPlaceholderText('Votre question…'), { target: { value: 'Aide fictive pour ouvrir un cours' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await waitFor(() => expect(fake.records).toHaveLength(1));
    expect(fake.inserts[0]).toEqual({ apprenant_id: 'fictional-learner', apprenant_nom: 'TEST FICTIF', question: 'Aide fictive pour ouvrir un cours' });
    cleanup();
    render(<ApprenantChatWidget apprenantId="fictional-learner" />);
    fireEvent.click(screen.getByRole('button', { name: 'Poser une question' }));
    expect(await screen.findByText('Aide fictive pour ouvrir un cours')).toBeInTheDocument();
  });
  it('ne confirme pas un refus de permission et conserve le texte local', async () => {
    fake.fail = true;
    render(<ApprenantChatWidget apprenantId="fictional-learner" />);
    fireEvent.click(screen.getByRole('button', { name: 'Poser une question' }));
    fireEvent.change(screen.getByPlaceholderText('Votre question…'), { target: { value: 'Demande fictive refusée' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(fake.records).toHaveLength(0);
    expect(screen.getByPlaceholderText('Votre question…')).toHaveValue('Demande fictive refusée');
  });
});