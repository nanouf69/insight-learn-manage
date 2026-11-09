import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/sessionRpc', () => ({ freshSessionRead: (read: () => unknown) => read() }));
import { pages } from '@/lib/premierPassageExamStatsRead';

describe('Lecture complète des preuves de premier passage', () => {
  it('lit 1 237 preuves sans tronquer le dénominateur à 1 000', async () => {
    const rows = Array.from({ length: 1237 }, (_, id) => ({ id }));
    const query = vi.fn(async (a: number, b: number) => ({ data: rows.slice(a, b + 1), error: null }));
    const result = await pages<{ id: number }>(query);
    expect(result).toHaveLength(1237);
    expect(result[1236].id).toBe(1236);
    expect(query.mock.calls).toEqual([[0, 499], [500, 999], [1000, 1499]]);
  });
  it('refuse un dénominateur partiel si la deuxième page échoue', async () => {
    await expect(pages(async (a) => a === 0
      ? { data: Array.from({ length: 500 }, (_, id) => ({ id })), error: null }
      : { data: null, error: new Error('Réseau') })).rejects.toThrow('Réseau');
  });
});