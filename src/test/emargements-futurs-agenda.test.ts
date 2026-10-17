// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { theorySlotsForAttendance } from '../lib/agendaSlots';
const session = { liste_attente: false, sessions: { type_session: 'theorique', date_debut: '2026-09-07', date_fin: '2026-09-28', heure_debut: '09:00', heure_fin: '16:00' } };
const bloc = { semaine_debut: '2026-09-07', jour: 0, heure_debut: '09:00', heure_fin: '12:00', publics_cibles: ['TAXI'] };
describe('Feuilles futures : journées pédagogiques prouvées', () => {
  it('aucun bloc = aucune journée inventée depuis dates de fiche ou quota', () => expect(theorySlotsForAttendance([session], [], 'taxi')).toEqual([]));
  it('bloc matin réel seulement, pas après-midi ni tous les jours de session', () => expect(theorySlotsForAttendance([session], [bloc], 'taxi')).toEqual([{ date: '2026-09-07', creneau: 'matin' }]));
  it('deux sessions chevauchantes dédoublonnées', () => expect(theorySlotsForAttendance([session, session], [bloc, bloc], 'taxi')).toHaveLength(1));
  it.each([{ ...session, liste_attente: true }, { ...session, emargements_exclus: true }])('attente/exclusion sans attentes', row => expect(theorySlotsForAttendance([row], [bloc], 'taxi')).toEqual([]));
  it('date personnalisée et soirée réellement retenues', () => {
    const row = { ...session, date_debut: '2026-09-08', heure_debut_personnalisee: '17:00', heure_fin_personnalisee: '21:00' };
    expect(theorySlotsForAttendance([row], [bloc], 'taxi')).toEqual([]);
    expect(theorySlotsForAttendance([row], [{ ...bloc, jour: 1, heure_debut: '17:00', heure_fin: '21:00' }], 'taxi')).toEqual([{date:'2026-09-08',creneau:'soir_1'},{date:'2026-09-08',creneau:'soir_2'}]);
  });
});