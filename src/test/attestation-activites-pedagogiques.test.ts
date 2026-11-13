import {describe,it,expect} from 'vitest';
import {periodePedagogiqueProuvee,synthesePeriodeElearning,type ActivitePedagogiquePreuve} from '@/lib/attestationActivitesPedagogiques';
const event:ActivitePedagogiquePreuve={id:'p',apprenantId:'lea',userId:'uid',at:'2026-10-13T08:21:57.414Z',type:'exercice_remis',serveur:true,qualifiante:true};
describe('Période e-learning prouvée',()=>{
 it('Léa : remise 13 octobre, pas connexion accueil 19 octobre',()=>expect(periodePedagogiqueProuvee([event],'lea','uid').derniere).toBe('2026-10-13'));
 it('lecture effective qualifiante peut devenir la dernière activité',()=>expect(periodePedagogiqueProuvee([event,{...event,id:'lecture',type:'lecture_effective',at:'2026-10-14T10:00:00Z'}],'lea','uid').derniere).toBe('2026-10-14'));
 it('simple ouverture non qualifiante exclue',()=>expect(periodePedagogiqueProuvee([{...event,qualifiante:false}],'lea','uid').derniere).toBeNull());
 it('timestamp non serveur exclu',()=>expect(periodePedagogiqueProuvee([{...event,serveur:false}],'lea','uid').derniere).toBeNull());
 it('compte ou dossier différent exclu',()=>expect(periodePedagogiqueProuvee([event],'lea','other').derniere).toBeNull());
 it('UTC/Paris passage au jour suivant',()=>expect(periodePedagogiqueProuvee([{...event,at:'2026-10-13T22:30:00Z'}],'lea','uid').derniere).toBe('2026-10-14'));
 it('heure hiver Paris reste exacte',()=>expect(periodePedagogiqueProuvee([{...event,at:'2026-11-13T23:30:00Z'}],'lea','uid').derniere).toBe('2026-11-14'));
 it('doublon exact sans effet',()=>expect(periodePedagogiqueProuvee([event,event],'lea','uid').derniere).toBe('2026-10-13'));
 it('doublon contradictoire refusé',()=>expect(()=>periodePedagogiqueProuvee([event,{...event,at:'2026-10-14T08:00:00Z'}],'lea','uid')).toThrow());
 it('reprise et activité tardive ne plafonnent pas la date réelle à la fin admin',()=>expect(periodePedagogiqueProuvee([event,{...event,id:'reprise',at:'2026-11-03T10:00:00Z'}],'lea','uid').derniere).toBe('2026-11-03'));
 it('38h11/60h ne certifie pas achèvement ni 60h',()=>expect(synthesePeriodeElearning({derniere:'2026-10-13',administrative:'2026-10-19',minutes:2291,cibleMinutes:3600,achevementProuve:true})).toMatchObject({finEffective:null,achevee:false,minutes:2291,administrative:'2026-10-19'}));
 it('100% heures sans preuve achèvement ne certifie pas',()=>expect(synthesePeriodeElearning({derniere:'2026-10-13',administrative:'2026-10-19',minutes:3600,cibleMinutes:3600,achevementProuve:false}).achevee).toBe(false));
 it('achèvement prouvé et durée acquise fin effective = dernière activité',()=>expect(synthesePeriodeElearning({derniere:'2026-10-13',administrative:'2026-10-19',minutes:3600,cibleMinutes:3600,achevementProuve:true}).finEffective).toBe('2026-10-13'));
 it('preuve absente jamais date inventée',()=>expect(periodePedagogiqueProuvee([],'lea','uid').derniere).toBeNull());
});