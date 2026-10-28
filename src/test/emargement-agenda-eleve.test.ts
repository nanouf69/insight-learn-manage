// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
const fromRows: any[] = [];
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...a: any[]) => rpc(...a),
    from: (_t: string) => {
      const q: any = { select: () => q, eq: () => q, order: () => q, range: async () => ({ data: fromRows, error: null }) };
      return q;
    },
  },
}));

import { getExpectedEmargements, theorySlotsForAttendance } from '@/lib/agendaSlots';

// Session TAXI/TA réelle (structure) : 26/10–16/11/2026, sans horaires de session.
const row = { id: 'r1', liste_attente: false, emargements_exclus: false, sessions: { type_session: 'theorique', statut: 'planifiee', date_debut: '2026-10-26', date_fin: '2026-11-16', heure_debut: null, heure_fin: null } };
const bloc = (jour: number, d: string, f: string) => ({ id: `${jour}${d}`, semaine_debut: '2026-10-26', jour, heure_debut: d, heure_fin: f, formation: 'Formation TAXI et TA (TAXI/TA)', publics_cibles: ['TAXI', 'TA'] });
const blocs = [bloc(0, '09:00', '12:00'), bloc(0, '13:00', '16:00'), bloc(1, '09:00', '12:00'), bloc(1, '13:00', '16:00'), bloc(2, '09:00', '12:00')];

describe('Feuilles dues élève présentiel (agenda lu par le serveur)', () => {
  beforeEach(() => { rpc.mockReset(); fromRows.length = 0; fromRows.push(row); vi.useFakeTimers(); });

  it('mer. 28/10 09h57 Paris : 5 feuilles dues (lun/mar matin+après-midi, mer matin)', async () => {
    vi.setSystemTime(new Date('2026-10-28T08:57:00Z'));
    rpc.mockResolvedValue({ data: blocs, error: null });
    const r = await getExpectedEmargements({ mode: 'presentiel', typeApprenant: 'taxi', apprenantId: 'a1', startDate: new Date(), endDate: new Date() });
    expect(rpc).toHaveBeenCalledWith('agenda_blocs_emargement_eleve', { p_apprenant_id: 'a1' });
    expect(r).toEqual([
      { date: '2026-10-26', creneau: 'matin' }, { date: '2026-10-26', creneau: 'apres_midi' },
      { date: '2026-10-27', creneau: 'matin' }, { date: '2026-10-27', creneau: 'apres_midi' },
      { date: '2026-10-28', creneau: 'matin' },
    ]);
  });

  it('avant 8h30 Paris le mercredi, le matin du jour n’est pas encore dû', async () => {
    vi.setSystemTime(new Date('2026-10-28T07:15:00Z')); // 08h15 Paris
    rpc.mockResolvedValue({ data: blocs, error: null });
    const r = await getExpectedEmargements({ mode: 'presentiel', typeApprenant: 'taxi', apprenantId: 'a1', startDate: new Date(), endDate: new Date() });
    expect(r).toHaveLength(4);
  });

  it('lecture agenda refusée = erreur (jamais « rien à signer »)', async () => {
    vi.setSystemTime(new Date('2026-10-28T08:57:00Z'));
    rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    await expect(getExpectedEmargements({ mode: 'presentiel', typeApprenant: 'taxi', apprenantId: 'a1', startDate: new Date(), endDate: new Date() })).rejects.toBeTruthy();
  });

  it('agenda vide (ancien comportement élève) = aucune feuille : c’était la cause', () => {
    expect(theorySlotsForAttendance([row], [], 'taxi')).toEqual([]);
  });

  it('TA : première semaine seulement, comme l’Admin', async () => {
    vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));
    rpc.mockResolvedValue({ data: [...blocs, { ...bloc(0, '09:00', '12:00'), id: 'w2', semaine_debut: '2026-11-02' }], error: null });
    const ta = await getExpectedEmargements({ mode: 'presentiel', typeApprenant: 'ta', apprenantId: 'a1', startDate: new Date(), endDate: new Date() });
    expect(ta.some(e => e.date === '2026-11-02')).toBe(false);
    const taxi = await getExpectedEmargements({ mode: 'presentiel', typeApprenant: 'taxi', apprenantId: 'a1', startDate: new Date(), endDate: new Date() });
    expect(taxi.some(e => e.date === '2026-11-02')).toBe(true);
  });

  it('cours du soir : soir_1 dû à 17h, soir_2 à 18h30 (Paris)', async () => {
    vi.setSystemTime(new Date('2026-10-26T17:40:00Z')); // 18h40 Paris
    fromRows[0] = { ...row, sessions: { ...row.sessions, heure_debut: '17:00', heure_fin: '21:00' } };
    rpc.mockResolvedValue({ data: [{ ...bloc(0, '17:00', '21:00'), publics_cibles: ['VTC'] }], error: null });
    const r = await getExpectedEmargements({ mode: 'presentiel', typeApprenant: 'vtc', apprenantId: 'a1', startDate: new Date(), endDate: new Date() });
    expect(r).toEqual([{ date: '2026-10-26', creneau: 'soir_1' }, { date: '2026-10-26', creneau: 'soir_2' }]);
  });
});
