import {describe,it,expect} from 'vitest';
import {libelleExamen} from './libelleExamen';
import {prefixeEb} from './marquageEbEnCours';
describe('filière explicite de tous les examens blancs',()=>{
  it.each([1,2,3,4,5,6])('EB%s et ses trois variantes',n=>{
    expect(libelleExamen(`EB${n}`)).toBe(`EB${n} VTC`);
    expect(libelleExamen(`EB${n}-TAXI`)).toBe(`EB${n} TAXI`);
    expect(libelleExamen(`eb${n}-ta`)).toBe(`EB${n} TA`);
    expect(libelleExamen(`eb${n}-va`)).toBe(`EB${n} VA`);
  });
  it('ne déduit aucune filière inconnue',()=>{
    expect(libelleExamen('EB99')).toBe('EB99');
    expect(libelleExamen('EB3-AUTRE')).toBe('EB3-AUTRE');
  });
  it('conserve le préfixe en cours',()=>{
    expect(prefixeEb({type:'crm',debut:'2026-11-01',fin:'2026-11-30'},'2026-11-11')+libelleExamen('EB4')).toBe('🔴 EN COURS — EB4 VTC');
  });
});