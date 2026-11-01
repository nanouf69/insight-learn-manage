import { describe, it, expect } from 'vitest';
import { buildSessionAgendaDays } from '@/lib/buildSessionAgendaDays';
describe('Feuilles nouvelles sans jours fictifs', () => {
  it('une semaine VTC reste cinq jours même avec un objectif de 90 heures', async () => {
    const days = await buildSessionAgendaDays({ dateDebut:'2026-11-02',dateFin:'2026-11-08',type_session:'theorique',typeApprenant:'vtc',heuresPresentielRequis:90 });
    expect(days).toHaveLength(5); expect(days[4].date.getDate()).toBe(6);
  });
  it('TA première semaine et date personnalisée conservées', async () => {
    const base={dateDebut:'2026-10-26',dateFin:'2026-11-16',type_session:'theorique',typeApprenant:'ta'};
    expect(await buildSessionAgendaDays(base)).toHaveLength(5);
    const inscription={date_fin_personnalisee:'2026-11-02',sessions:{type_session:'theorique',date_debut:'2026-10-26',date_fin:'2026-11-16'}};
    expect(await buildSessionAgendaDays({...base,inscription})).toHaveLength(6);
  });
  it('soir garde deux plages distinctes', async () => {
    const days=await buildSessionAgendaDays({dateDebut:'2026-11-02',dateFin:'2026-11-02',title:'VTC soir',type_session:'theorique',typeApprenant:'vtc'});
    expect(days[0]).toMatchObject({matinDebut:'17:00',matinFin:'18:30',apremDebut:'18:30',apremFin:'21:00'});
  });
  it('attente et exclusion ne génèrent aucune feuille', async () => {
    for(const flag of ['liste_attente','emargements_exclus']) {
      const inscription={[flag]:true,sessions:{type_session:'theorique',date_debut:'2026-11-02',date_fin:'2026-11-06'}};
      expect(await buildSessionAgendaDays({dateDebut:'2026-11-02',dateFin:'2026-11-06',type_session:'theorique',typeApprenant:'vtc',inscription})).toHaveLength(0);
    }
  });
});