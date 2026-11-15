import { describe, it, expect, vi, beforeEach } from 'vitest';
const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));
import { verifierActivationBilan505, remettreBilan505, Bilan505Desactive } from '@/lib/bilan505Remise';
const answers = Object.fromEntries(Array.from({ length: 49 }, (_, i) => [`505-${i + 1}`, ['A']]));
beforeEach(() => rpc.mockReset());
describe('activation 505 décidée par le serveur seulement', () => {
  it('fonction absente (production actuelle) → désactivé', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Could not find the function public.bilan_505_remise_eligible' } });
    expect(await verifierActivationBilan505('a')).toBe(false);
  });
  it('erreur réseau → désactivé', async () => { rpc.mockImplementation(() => ({ then: (_ok: unknown, ko: (e: Error) => void) => ko(new Error('offline')) })); expect(await verifierActivationBilan505('a')).toBe(false); });
  it('interrupteur éteint ou copie hors lot → désactivé', async () => {
    rpc.mockResolvedValue({ data: { actif: false }, error: null }); expect(await verifierActivationBilan505('a')).toBe(false);
  });
  it('réponse inattendue (mode inconnu, actif non booléen) → désactivé', async () => {
    rpc.mockResolvedValue({ data: { actif: true, mode: 'autre' }, error: null }); expect(await verifierActivationBilan505('a')).toBe(false);
    rpc.mockResolvedValue({ data: { actif: 'true', mode: 'remise' }, error: null }); expect(await verifierActivationBilan505('a')).toBe(false);
  });
  it('copie du lot, interrupteur allumé → activé', async () => {
    rpc.mockResolvedValue({ data: { actif: true, mode: 'recuperation' }, error: null }); expect(await verifierActivationBilan505('a')).toBe(true);
  });
  it('arrêt immédiat pendant la lecture : erreur dédiée, aucune remise tentée', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'bilan505_desactive' } });
    const commit = vi.fn();
    await expect(remettreBilan505({ apprenantId: 'a', answers, current: () => answers, owner: () => true, pending: () => [], commit }))
      .rejects.toBeInstanceOf(Bilan505Desactive);
    expect(commit).not.toHaveBeenCalled();
  });
  it('arrêt immédiat au clic final : erreur dédiée', async () => {
    const row = { id: 'r', tentative: 1, write_seq: 1, status: 'in_progress', reponses: answers, stored_reponses: answers, grading_status: 'verifiable' };
    rpc.mockResolvedValue({ data: null, error: { message: 'bilan505_hors_lot' } });
    await expect(remettreBilan505({ apprenantId: 'a', answers, current: () => answers, owner: () => true, pending: () => [], read: async () => row }))
      .rejects.toBeInstanceOf(Bilan505Desactive);
  });
});
