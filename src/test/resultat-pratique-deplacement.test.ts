import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ replies: [] as any[], calls: [] as any[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from(table: string) {
    const call: any = { table, filters: [] };
    mock.calls.push(call);
    const reply = mock.replies.shift();
    const chain: any = {
      select: () => chain,
      eq: (key: string, value: string) => { call.filters.push([key, value]); return chain; },
      in: () => chain,
      update: (value: unknown) => { call.update = value; return chain; },
      single: () => Promise.resolve(reply),
      then: (resolve: any, reject: any) => Promise.resolve(reply).then(resolve, reject),
    };
    return chain;
  },
} }));
import { enregistrerDeplacementPratique } from '@/lib/resultatPratiqueDeplacement';

describe('Déplacement depuis les résultats pratique', () => {
  beforeEach(() => { mock.replies = []; mock.calls = []; });
  it('confirme le statut sans écrire un autre planning ni supprimer une réservation', async () => {
    mock.replies = [
      { data: [], error: null },
      { data: [{ id: 'inscription', presence_pratique: null }], error: null },
      { data: { id: 'inscription', presence_pratique: 'deplace' }, error: null },
      { data: { id: 'candidat', resultat_examen_pratique: 'deplace' }, error: null },
    ];
    await enregistrerDeplacementPratique('candidat');
    expect(mock.calls.map(c => c.table)).toEqual(['reservations_pratique', 'session_apprenants', 'session_apprenants', 'apprenants']);
    expect(mock.calls[2].filters).toEqual([['id', 'inscription'], ['apprenant_id', 'candidat']]);
    expect(mock.calls[3].update).toEqual({ resultat_examen_pratique: 'deplace' });
  });
  it('conserve une réservation existante et ne commence aucune écriture', async () => {
    mock.replies = [{ data: [{ id: 'reservation' }], error: null }];
    await expect(enregistrerDeplacementPratique('candidat')).rejects.toThrow('réservation');
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].update).toBeUndefined();
  });
  it('refuse une lecture échouée sans écrire', async () => {
    mock.replies = [{ data: null, error: new Error('lecture refusée') }];
    await expect(enregistrerDeplacementPratique('candidat')).rejects.toThrow('lecture refusée');
    expect(mock.calls).toHaveLength(1);
  });
  it('ne confirme pas une inscription dont la mise à jour est refusée', async () => {
    mock.replies = [{ data: [] }, { data: [{ id: 'inscription' }] }, { data: null, error: new Error('refus inscription') }];
    await expect(enregistrerDeplacementPratique('candidat')).rejects.toThrow('refus inscription');
    expect(mock.calls.some(c => c.table === 'apprenants')).toBe(false);
  });
  it('refuse une absence de confirmation de la fiche', async () => {
    mock.replies = [{ data: [] }, { data: [] }, { data: null, error: null }];
    await expect(enregistrerDeplacementPratique('candidat')).rejects.toThrow('pas été confirmé');
  });
});