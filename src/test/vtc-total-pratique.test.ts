import { describe, expect, it } from 'vitest';
import { estVtcPresentiel, pratiquePrevueVtc, tauxTotalPresence } from '@/lib/tauxTotalPresence';
import { calculerTauxPresenceHeures } from '@/components/crm/TauxPresenceSessionsCard';
const total = (theorie: number, prevues: number, pratique = 0) => tauxTotalPresence({ session: { faites: theorie, prevues }, pratique: { faites: pratique, prevues: pratiquePrevueVtc(prevues, 0, true) } });
describe('VTC présentiel TOTAL théorie + 6 heures de pratique', () => {
  it('CHERNI théorie 37,5/40=93,75 %, TOTAL 37,5/46=81,52 %', () => {
    const r = total(37.5,40);
    expect(37.5/40*100).toBe(93.75);
    expect(r?.faites).toBe(37.5); expect(r?.prevues).toBe(46);
    expect(r?.pct).toBeCloseTo(81.52173913);
    expect(Math.round((r?.pct ?? 0)*10)/10).toBe(81.5);
  });
  it('journée théorie 60/60=100 %, TOTAL sans pratique 60/66=90,9 %', () => {
    const r=total(60,60); expect(r?.prevues).toBe(66);
    expect(Math.round((r?.pct ?? 0)*10)/10).toBe(90.9);
  });
  it.each([40,60])('théorie %s complète : seules 6h pratiques permettent 100 %', h => {
    for (const p of [0,1.5,3,5.5]) expect(total(h,h,p)?.pct).toBeLessThan(100);
    expect(total(h,h,6)?.pct).toBe(100);
  });
  it('surplus théorie ne compense pas la pratique manquante', () => {
    expect(total(46,40)?.pct).toBeLessThan(100);
  });
  it('absence inscription pratique prévoit 6h sans aucune preuve fabriquée', () => {
    const ins=[{sessions:{id:'soir',type_session:'theorique',nom:'VTC cours du soir',date_debut:'2026-09-14',date_fin:'2026-09-27'}}];
    const r=calculerTauxPresenceHeures([],ins,'vtc');
    expect(r.session.prevues).toBe(40);expect(r.pratique.prevues).toBe(6);expect(r.pratique.faites).toBe(0);
  });
  it('session pratique inscrite deux fois ne donne ni 12h prévues ni double preuve', () => {
    const theory={sessions:{id:'jour',type_session:'theorique',nom:'VTC',types_apprenant:['VTC'],date_debut:'2026-09-14',date_fin:'2026-09-27'}};
    const practice={sessions:{id:'pratique',type_session:'pratique',date_debut:'2026-09-28',date_fin:'2026-09-28',heure_debut:'09:00',heure_fin:'16:00',heures_total:6}};
    const r=calculerTauxPresenceHeures([],[theory,practice,practice],'vtc');
    expect(r.pratique.prevues).toBe(6); expect(tauxTotalPresence(r)?.prevues).toBe(66);
  });
  it.each(['vtc-e','vtc-elearning','pa vtc','continue-vtc','taxi','ta'])('%s ne reçoit pas la règle VTC présentiel', type => {
    expect(estVtcPresentiel({type_apprenant:type})).toBe(false);
    expect(pratiquePrevueVtc(40,0,false)).toBe(0);
  });
  it('réservation seule ne prouve rien ; signatures et horaires enregistrés prouvent 3 puis 6h', () => {
    const ins=[{sessions:{id:'soir',type_session:'theorique',nom:'VTC cours du soir',date_debut:'2026-09-14',date_fin:'2026-09-27'}}];
    const reservations=[{date_choisie:'2026-09-28',type_formation:'vtc',creneau:'journee'}];
    const configs=[{day_time_slots:{'2026-09-28':{matin:'9h-12h',apresmidi:'13h-16h'}}}];
    const morning={date_emargement:'2026-09-28',demi_journee:'matin',signature_data_url:'data:image/png;base64,fictif'};
    const afternoon={...morning,demi_journee:'apres_midi'};
    expect(calculerTauxPresenceHeures([],ins,'vtc',reservations,configs).pratique.faites).toBe(0);
    expect(calculerTauxPresenceHeures([morning],ins,'vtc',reservations,configs).pratique.faites).toBe(3);
    expect(calculerTauxPresenceHeures([morning,morning,afternoon],ins,'vtc',reservations,configs).pratique.faites).toBe(6);
  });
});