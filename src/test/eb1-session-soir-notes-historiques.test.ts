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
import { isExamAttemptPublicationPending } from '@/components/cours-en-ligne/exam-helpers';

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
        expect(isExamAttemptPublicationPending([attached])).toBe(false);
        if (row.details.qrc_pending_correction) { falsePending++; affected.add(row.apprenant_id); }
      } else { pending++; expect(attached.__core.qrcRestantes).toBe(4); }
      expect(noteExamenAffichee(attacherSourceUnique(attached, states?.get(row.apprenant_id) ?? null, new Set()))).toEqual(note);
    }
    expect({ notes, pending, falsePending, affected: affected.size }).toEqual({ notes: 118, pending: 1, falsePending: 59, affected: 13 });
    expect(JSON.stringify(fixture)).toBe(before);
  });
  it('modifications, suppressions, ajouts et réordre ultérieurs ne changent aucune des 118 notes ; identité conflictuelle refusée', async () => {
    const ids = [...new Set(fixture.exam_attempts_v2.map(a => a.apprenant_id))];
    const states = await fetchCoreMatiereStatesBulk(ids);
    const archived = new Set(fixture.core_exam_resets.flatMap(r => r.archived_legacy_result_ids));
    for (const row of fixture.apprenant_quiz_results.filter(r => !archived.has(r.id))) {
      const source = states?.get(row.apprenant_id) ?? null;
      const initial = noteExamenAffichee(attacherSourceUnique(row, source, new Set()));
      for (const questions of [[], [...row.details.questions].reverse(), [{ questionId: 9000, type: 'QRC', enonce: 'Added question' }]]) {
        const edited = { ...row, completed_at: '2020-01-01T00:00:00Z', details: { ...row.details, questions } };
        expect(noteExamenAffichee(attacherSourceUnique(edited, source, new Set()))).toEqual(initial);
      }
      const conflict = { ...row, details: { ...row.details, reponses: { ...row.details.reponses, 9000: 'foreign answer' } } };
      expect(noteExamenAffichee(attacherSourceUnique(conflict, source, new Set())).etat).toBe('lecture_impossible');
    }
  });
});
describe('EB1 soirée : écran Notes complet (plus de masquage inter-matières)', () => {
  it('118 notes visibles, seule la matière à 4 QRC non corrigées reste en attente', async () => {
    const { idsResultatsNonPublies } = await import('@/lib/noteExamenAffichee');
    const ids = [...new Set(fixture.exam_attempts_v2.map(a => a.apprenant_id))];
    const states = await fetchCoreMatiereStatesBulk(ids);
    const archived = new Set(fixture.core_exam_resets.flatMap(r => r.archived_legacy_result_ids));
    let visibles = 0; const attentes: any[] = []; let freresVisibles = 0;
    for (const id of ids) {
      const rows = fixture.apprenant_quiz_results.filter(r => r.apprenant_id === id && !archived.has(r.id))
        .map(r => attacherSourceUnique(r, states?.get(id) ?? null, new Set()));
      const pending = idsResultatsNonPublies(rows as any);
      for (const r of rows) {
        if (pending.has(String(r.id))) attentes.push(r);
        else { visibles++; expect(noteExamenAffichee(r).etat).toBe('note'); }
      }
      if (pending.size) freresVisibles += rows.filter(r => !pending.has(String(r.id)) && rows.some(p => pending.has(String(p.id)) && p.quiz_id === r.quiz_id && (p.tentative ?? 1) === (r.tentative ?? 1))).length;
    }
    expect(visibles).toBe(118);
    expect(attentes).toHaveLength(1);
    expect(attentes[0].__core.qrcRestantes).toBe(4);
    // Les autres matières du même examen/tentative (cas Kama) restent visibles.
    expect(freresVisibles).toBeGreaterThanOrEqual(5);
  });
  it('ligne archivée/reset ou lecture impossible : jamais publiée', async () => {
    const { idsResultatsNonPublies } = await import('@/lib/noteExamenAffichee');
    const row = { ...fixture.apprenant_quiz_results[0] };
    expect(idsResultatsNonPublies([attacherSourceUnique(row, null, new Set()) as any]).has(String(row.id))).toBe(true);
  });
});
