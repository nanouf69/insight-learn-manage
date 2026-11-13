import { describe, it, expect } from 'vitest';
import { calculerTauxPresenceHeures } from '@/components/crm/TauxPresenceSessionsCard';
import { tauxTotalPresence } from '@/lib/tauxTotalPresence';
const theory=(track:string,h:number)=>({sessions:{id:'t',type_session:'theorique',nom:track,types_apprenant:[track.toUpperCase()],heures_total:h,date_debut:'2026-09-14',date_fin:'2026-09-18'}});
describe('Le lot VTC ne transpose aucune durée TAXI/TA/VA',()=>{
  it.each([['taxi',90],['ta',30],['va',30]] as const)('%s garde sa durée configurée sans supplément automatique', (track,h)=>{
    const ins=[theory(track,h)];
    const val=[{id:'proof',date_presence:'2026-09-18',categorie:'theorie',heures:h}];
    const result=calculerTauxPresenceHeures([],ins,track,[],[],val,true);
    expect(result.session.prevues).toBe(h);expect(result.pratique.prevues).toBe(0);
    expect(tauxTotalPresence(result)?.prevues).toBe(h);expect(tauxTotalPresence(result)?.pct).toBe(100);
  });
  it.each(['taxi','ta','va'])('%s garde la pratique explicitement configurée',track=>{
    const ins=[theory(track,30),{sessions:{id:'p',type_session:'pratique',heures_total:4,date_debut:'2026-09-21',date_fin:'2026-09-21'}}];
    const result=calculerTauxPresenceHeures([],ins,track);
    expect(result.pratique.prevues).toBe(4);expect(tauxTotalPresence(result)?.prevues).toBe(34);
  });
  it.each(['taxi','ta','va'])('%s ne reçoit pas les heures supplémentaires de la nouvelle lecture VTC',track=>{
    const signature={date_emargement:'2026-09-21',demi_journee:'matin',signature_data_url:'data:image/png;base64,fictif'};
    const res=calculerTauxPresenceHeures([signature],[theory(track,30)],track,[{date_choisie:'2026-09-21',type_formation:track,creneau:'journee'}],[{day_time_slots:{'2026-09-21':{matin:'9h-12h',apresmidi:'13h-16h'}}}],[],true);
    expect(res.pratique.faites).toBe(0);expect(res.pratique.prevues).toBe(0);
  });
});