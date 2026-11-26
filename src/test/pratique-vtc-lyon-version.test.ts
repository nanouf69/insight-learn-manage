import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { lireVersionQuizLyon, deciderVersionLyon } from '@/lib/pratiqueVtcLyonVersion';
import { fusionnerQuizLyon, QUIZ_LYON_INITIAL_ID } from '@/lib/pratiqueVtcLyonFusion';

const module8 = () => ({ id: 8, exercices: [{ id: QUIZ_LYON_INITIAL_ID, questions: Array.from({ length: 99 }, (_, i) => ({ id: i + 1, enonce: `Q initiale ${i + 1}` })) }] });

function client(tables: Record<string, any[]>, ecritures: string[], erreur = false) {
  return {
    from(t: string) {
      const q: any = {
        select: () => q, eq: () => q, in: () => q,
        insert: () => { ecritures.push(t); return q; }, update: () => { ecritures.push(t); return q; },
        upsert: () => { ecritures.push(t); return q; }, delete: () => { ecritures.push(t); return q; },
        then: (r: any) => r(erreur ? { data: null, error: { message: 'x' } } : { data: tables[t] ?? [], error: null }),
      };
      return q;
    },
    rpc: () => Promise.resolve({ error: { code: 'PGRST202' } }),
  };
}
const nb = (v: string) => (v === 'enrichie' ? fusionnerQuizLyon(module8()) : module8()).exercices[0].questions.length;
const rep99 = Object.fromEntries(Array.from({ length: 99 }, (_, i) => [`${QUIZ_LYON_INITIAL_ID}-${i + 1}`, ['A']]));

describe('version du quiz Lyon par apprenant', () => {
  it('tentative terminée → 99, zéro écriture', async () => {
    const w: string[] = [];
    const v = await lireVersionQuizLyon('a', client({ reponses_apprenants: [{ reponses: rep99, total_questions: 99 }] }, w));
    expect(nb(v)).toBe(99); expect(w).toEqual([]);
  });
  it('tentative commencée → 99, zéro écriture', async () => {
    const w: string[] = [];
    const v = await lireVersionQuizLyon('a', client({ reponses_apprenants: [{ reponses: { [`${QUIZ_LYON_INITIAL_ID}-3`]: ['B'] }, total_questions: null }] }, w));
    expect(nb(v)).toBe(99); expect(w).toEqual([]);
  });
  it('trace seulement dans la validation du module ou l’historique → 99', async () => {
    expect(nb(await lireVersionQuizLyon('a', client({ apprenant_module_completion: [{ details: { [String(QUIZ_LYON_INITIAL_ID)]: {} } }] }, [])))).toBe(99);
    expect(nb(await lireVersionQuizLyon('a', client({ reponses_apprenants_historique: [{ reponses: {}, total_questions: 99 }] }, [])))).toBe(99);
  });
  it('aucune tentative → 138, zéro écriture', async () => {
    const w: string[] = [];
    expect(nb(await lireVersionQuizLyon('a', client({}, w)))).toBe(138); expect(w).toEqual([]);
  });
  it('passage déjà commencé sur 138 (réponse à une question 100+) reste 138', () => {
    expect(deciderVersionLyon([{ reponses: { [`${QUIZ_LYON_INITIAL_ID}-105`]: ['A'] } }], false)).toBe('enrichie');
  });
  it('erreur de lecture → 99', async () => {
    expect(nb(await lireVersionQuizLyon('a', client({}, [], true)))).toBe(99);
  });
  it('cohorte serveur 138 conservée dès la première réponse, sans écriture', async () => {
    const w: string[] = []; const c = client({ reponses_apprenants: [{ reponses: rep99 }] }, w);
    c.rpc = () => Promise.resolve({ data: 138 } as any);
    expect(nb(await lireVersionQuizLyon('a', c))).toBe(138); expect(w).toEqual([]);
  });
  it('cohorte serveur historique prioritaire sur un total navigateur 138', async () => {
    const w: string[] = []; const c = client({ reponses_apprenants: [{ total_questions: 138 }] }, w);
    c.rpc = () => Promise.resolve({ data: 99 } as any);
    expect(nb(await lireVersionQuizLyon('a', c))).toBe(99); expect(w).toEqual([]);
  });
});
