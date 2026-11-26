import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const transport = vi.fn();
import { envoyerAvisSuppression as envoyer } from '../../supabase/functions/_shared/factureSuppressionEnvoi';
import { statutAvisSuppression } from '../../supabase/functions/_shared/factureSuppressionAvis';

const envoyerAvisSuppression = (admin: SupabaseClient, id: string, user: { id: string }) => envoyer(admin, id, user, { configure: true, envoyer: transport });

type Row = Record<string, any>;
function fixture() {
  const original = { id: 'f1', numero: '20260724002', client_email: 'financeur@example.test', updated_at: '2026-11-26T16:11:00Z', montant_ttc: 200, statut: 'payee' };
  const trace = { id: 's1', facture_id: original.id, numero: original.numero, snapshot: { ...original, _corbeille: { version: 1, action: 'supprimer' } } };
  const journal: Row[] = [trace];
  const writes: string[] = [];
  let rejectReceipt = false;
  const admin = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      let inserted: Row | undefined;
      const execute = () => {
        if (inserted) {
          writes.push(table);
          if (table !== 'factures_supprimees') throw new Error('Mutation financière interdite');
          if (journal.some(t => t.id === inserted?.id)) return { data: null, error: { code: '23505' } };
          if (rejectReceipt && inserted.snapshot._corbeille.action === 'avis_suppression_envoye') return { data: null, error: { code: 'failure' } };
          journal.push(inserted);
          return { data: inserted, error: null };
        }
        const rows = table === 'factures' ? [original] : journal;
        return { data: rows.filter(t => filters.every(([key, value]) => t[key] === value)), error: null };
      };
      const q = {
        select: () => q,
        eq: (key: string, value: unknown) => { filters.push([key, value]); return q; },
        order: () => q,
        range: async () => execute(),
        insert: (value: Row) => { inserted = value; return q; },
        single: async () => { const r = execute(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; },
        maybeSingle: async () => { const r = execute(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; },
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(execute()).then(resolve),
      };
      return q;
    },
  } as unknown as SupabaseClient;
  return { admin, original, trace, journal, writes, failReceipt: () => { rejectReceipt = true; } };
}

describe('Envoi après suppression : aucune mutation ni double mail', () => {
  beforeEach(() => {
    transport.mockReset().mockResolvedValue('mail-fictif-1');
  });
  it('avertit le financeur après preuve de suppression de 20260724002, conserve facture payée et 200 €', async () => {
    const f = fixture();
    const before = { ...f.original };
    const result = await envoyerAvisSuppression(f.admin, 's1', { id: 'admin' });
    expect(result).toMatchObject({ envoye: true, suppressionId: 's1' });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][0].to).toBe('financeur@example.test');
    expect(f.original).toEqual(before);
    expect(f.original.montant_ttc).toBe(200);
    expect(f.original.statut).toBe('payee');
    expect(f.writes).toEqual(['factures_supprimees', 'factures_supprimees']);
    expect(statutAvisSuppression(f.trace, f.journal as any)).toBe('envoye');
  });
  it('deux demandes concurrentes et un nouvel appel ne produisent qu’un mail', async () => {
    const f = fixture();
    await Promise.all([envoyerAvisSuppression(f.admin, 's1', { id: 'admin' }), envoyerAvisSuppression(f.admin, 's1', { id: 'admin' })]);
    await envoyerAvisSuppression(f.admin, 's1', { id: 'admin' });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(f.journal.filter(r => r.snapshot._corbeille.action === 'avis_suppression_engage')).toHaveLength(1);
  });
  it('aucun envoi avant suppression confirmée', async () => {
    const f = fixture();
    await envoyerAvisSuppression(f.admin, 'aucune-suppression', { id: 'admin' });
    expect(transport).not.toHaveBeenCalled();
    expect(f.writes).toEqual([]);
  });
  it('ne contacte pas le destinataire après une remise', async () => {
    const f = fixture();
    f.journal.push({ id: 'remise', facture_id: 'f1', numero: '20260724002', snapshot: { _corbeille: { version: 1, action: 'remettre', suppression_id: 's1' } } });
    await envoyerAvisSuppression(f.admin, 's1', { id: 'admin' });
    expect(transport).not.toHaveBeenCalled();
    expect(f.writes).toEqual([]);
  });
  it('une réponse fournisseur inconnue conserve la prise et interdit tout renvoi', async () => {
    const f = fixture();
    transport.mockRejectedValue(new Error('Résultat inconnu'));
    expect(await envoyerAvisSuppression(f.admin, 's1', { id: 'admin' })).toMatchObject({ statut: 'indetermine' });
    await envoyerAvisSuppression(f.admin, 's1', { id: 'admin' });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(statutAvisSuppression(f.trace, f.journal as any)).toBe('indetermine');
  });
  it('un mail accepté mais un reçu impossible n’est jamais réexpédié', async () => {
    const f = fixture();
    f.failReceipt();
    expect(await envoyerAvisSuppression(f.admin, 's1', { id: 'admin' })).toMatchObject({ statut: 'indetermine' });
    await envoyerAvisSuppression(f.admin, 's1', { id: 'admin' });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('une adresse modifiée depuis la confirmation empêche l’avis à un autre destinataire', async () => {
    const f = fixture();
    f.original.client_email = 'autre@example.test';
    expect(await envoyerAvisSuppression(f.admin, 's1', { id: 'admin' })).toMatchObject({ statut: 'non_envoye' });
    expect(transport).not.toHaveBeenCalled();
    expect(f.writes).toEqual([]);
  });
});