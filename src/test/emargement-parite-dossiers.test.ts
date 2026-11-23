import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { creneauxManquants, indexerEmargements, type LigneEmargement } from '@/lib/emargementLecture';
const datesOctobre = ['2026-10-28', '2026-10-29'];
const datesNovembre = ['2026-11-17', '2026-11-18'];
const slots = (dates: string[]) => dates.flatMap(date => [{ date, creneau: 'matin' as const }, { date, creneau: 'apres_midi' as const }]);
const signatures: LigneEmargement[] = slots(datesOctobre).map((s, i) => ({ id: `preuve-${i}`, date_emargement: s.date, demi_journee: s.creneau, signed_at: '2026-11-17T12:15:00Z', signature_data_url: 'data:image/png;base64,fixture' }));
describe('Émargements FC VTC : même projection par dossier admin/apprenant', () => {
  it('28–29 octobre : quatre signatures tardives ne deviennent pas des signatures de novembre', () => {
    const admin = indexerEmargements(signatures);
    const eleve = indexerEmargements([...signatures].reverse());
    expect([...admin]).toEqual([...eleve]);
    expect([...admin.keys()]).toEqual(slots(datesOctobre).map(s => `${s.date}|${s.creneau}`));
    expect(creneauxManquants(signatures, slots(datesOctobre))).toEqual([]);
  });
  it('17–18 novembre : quatre non-signés sur le dossier distinct sans emprunter octobre', () => {
    expect(creneauxManquants([], slots(datesNovembre))).toEqual(slots(datesNovembre));
    expect(creneauxManquants(signatures, slots(datesNovembre))).toHaveLength(4);
  });
  it('une relecture avec une signature confirmée retire exactement le bon manque', () => {
    const s = { ...signatures[0], date_emargement: '2026-11-17' };
    expect(creneauxManquants([s], slots(datesNovembre))).toEqual(slots(datesNovembre).slice(1));
    expect(creneauxManquants([], slots(datesNovembre))).toHaveLength(4);
  });
  it('une ligne vide plus récente ne masque jamais une preuve signée antérieure', () => {
    const blank = { ...signatures[0], id: 'vide', signature_data_url: null, signed_at: '2026-11-23T12:00:00Z' };
    expect(indexerEmargements([blank, ...signatures]).get('2026-10-28|matin')?.id).toBe('preuve-0');
    expect(signatures).toHaveLength(4);
  });
  it('absence déclarée reste distincte de signature', () => {
    const absent = { ...signatures[0], signature_data_url: null, absent: true };
    expect(creneauxManquants([absent], slots(datesOctobre))).toHaveLength(3);
    expect(indexerEmargements([absent]).get('2026-10-28|matin')?.signature_data_url).toBeNull();
  });
});