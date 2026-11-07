// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import fixture from './fixtures/eb1-session-soir-anonymisee.json';
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  let ids: string[] = [];
  const q: any = { select: () => q, eq: () => q, in: (_: string, values: string[]) => { ids = values; return q; }, range: async (from: number, to: number) => ({ data: ((fixture as any)[table] ?? []).filter((r: any) => !r.apprenant_id || ids.includes(r.apprenant_id)).slice(from, to + 1), error: null }) };
  return q;
} } }));
import { fetchCoreMatiereStatesBulk } from '@/lib/coreExamPublication';
import { attacherSourceUnique, noteExamenAffichee } from '@/lib/noteExamenAffichee';

describe('EB1 soirée : 18 comptes anonymisés, aucun recalcul', () => {
  it('119 matières actives : 118 notes persistées et une vraie attente ; 59 faux pending supprimés à l’affichage', async () => {
    const before = JSON.stringify(fixture);
    const ids = [...new Set(fixture.exam_attempts_v2.map(a => a.apprenant_id))];
    expect(ids).toHaveLength(18);
    const states = await fetchCoreMatiereStatesBulk(ids);
    expect(states).not.toBeNull();
    const archived = new Set(fixture.core_exam_resets.flatMap(r => r.archived_legacy_result_ids));
    const rows = fixture.apprenant_quiz_results.filter(r => !archived.has(r.id));
    expect(rows).toHaveLength(119);
    let notes = 0, pending = 0, falsePending = 0;
    const affected = new Set<string>();
    for (const row of rows) {
      const attached = attacherSourceUnique(row, states?.get(row.apprenant_id) ?? null, new Set());
      const note = noteExamenAffichee(attached);
      if (note.etat === 'note') {
        notes++;
        expect(note.source).toBe('noyau');
        expect(note.note20).toBe(Number(attached.__core.note20.toFixed(1)));
        if (row.details.qrc_pending_correction) { falsePending++; affected.add(row.apprenant_id); }
      } else { pending++; expect(attached.__core.qrcRestantes).toBe(4); }
      expect(noteExamenAffichee(attacherSourceUnique(attached, states?.get(row.apprenant_id) ?? null, new Set()))).toEqual(note);
    }
    expect({ notes, pending, falsePending, affected: affected.size }).toEqual({ notes: 118, pending: 1, falsePending: 59, affected: 13 });
    expect(JSON.stringify(fixture)).toBe(before);
  });
});