import {describe,it,expect} from 'vitest';
import {liensCpfInitiaux,validerLienCpf} from '@/lib/qualiopi/liensCpf';
describe('catalogue CPF',()=>{
 it('reprend les sept formations sans changer leurs adresses',()=>{expect(liensCpfInitiaux).toHaveLength(7);expect(liensCpfInitiaux[0].url).toBe('https://www.moncompteformation.gouv.fr/espace-prive/html/#/formation/recherche/82346156100016_VTC/82346156100016_VTC');expect(liensCpfInitiaux[6].url).toBe('https://www.moncompteformation.gouv.fr/espace-prive/html/#/formation/recherche/82346156100016_TAXIcourt/82346156100016_TAXI3');});
 it('refuse les URL exécutables et non HTTPS',()=>{for(const u of ['javascript:alert(1)','http://example.com','https://user:password@example.com'])expect(()=>validerLienCpf('CPF',u)).toThrow();expect(()=>validerLienCpf('CPF','https://example.com/path')).not.toThrow();});
 it('intitulé obligatoire',()=>expect(()=>validerLienCpf(' ','https://example.com')).toThrow());
});