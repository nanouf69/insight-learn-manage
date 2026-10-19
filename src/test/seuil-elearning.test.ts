import { describe, expect, it } from 'vitest';
import { dernierJalonConfirme, seuilElearning } from '@/lib/seuilElearning';
import { elearningHoursEvidence } from '@/lib/elearningHoursEvidence';

describe('Avertissement 50 % sans mutation', () => {
  it('20/60 : seuil 30, reste 10', () => expect(seuilElearning({type_apprenant:'vtc-e'},20,60)).toEqual({etat:'non_atteint',fait:20,prevu:60,seuil:30,restant:10}));
  it('30/60 : seuil atteint', () => expect(seuilElearning({type_apprenant:'vtc-e'},30,60).etat).toBe('atteint'));
  it('arrondi affiché 50 % mais strictement sous 30 h', () => expect(seuilElearning({type_apprenant:'vtc-e'},29.99,60).etat).toBe('non_atteint'));
  it.each([['taxi-e',90,45],['ta-e',35,17.5],['va-e',7,3.5]])('seuil contractuel %s', (type,prevu,seuil) => {
    expect(seuilElearning({type_apprenant:type},0,prevu)).toMatchObject({seuil,restant:seuil});
    expect(seuilElearning({type_apprenant:type},seuil,prevu).etat).toBe('atteint');
  });
  it('pratique seule exclue', () => expect(seuilElearning({type_apprenant:'pratique-vtc'},0,60).etat).toBe('hors_perimetre'));
  it('lecture échouée ne signifie pas zéro', () => expect(seuilElearning({type_apprenant:'vtc-e'},0,60,false).etat).toBe('indisponible'));
  it.each([0,null,undefined,NaN])('durée inconnue %s', prevu => expect(seuilElearning({type_apprenant:'vtc-e'},0,prevu).etat).toBe('indisponible'));
  it('rappel seulement transition serveur dernier jalon même compte', () => {
    expect(dernierJalonConfirme({owner:'a',total:10,termines:9},{owner:'a',total:10,termines:10})).toBe(true);
    expect(dernierJalonConfirme(null,{owner:'a',total:10,termines:10})).toBe(false);
    expect(dernierJalonConfirme({owner:'a',total:10,termines:9},{owner:'b',total:10,termines:10})).toBe(false);
    expect(dernierJalonConfirme({owner:'a',total:10,termines:9},{owner:'a',total:10,termines:9})).toBe(false);
    expect(dernierJalonConfirme({owner:'a',total:10,termines:10},{owner:'a',total:10,termines:10})).toBe(false);
  });
  it('heures partagées : preuves nécessaires, découpe pratique, aucune mutation', () => {
    const args = {apprenantId:'fictif',apprenant:{},acts:[{module_nom:'Cours',action_type:'open_module',occurred_at:'2026-10-19T08:30:00Z'},{module_nom:'Cours',action_type:'open_module',occurred_at:'2026-10-19T10:30:00Z'}],quizzes:[],exos:[],cnxAll:[{started_at:'2026-10-19T08:00:00Z',ended_at:'2026-10-19T11:00:00Z',last_seen_at:'2026-10-19T11:00:00Z'}],pratiqueDates:[] as string[]};
    const before=JSON.stringify(args);
    expect(elearningHoursEvidence(args).onlineMin).toBe(180);
    expect(elearningHoursEvidence({...args,acts:[]}).onlineMin).toBe(0);
    expect(elearningHoursEvidence({...args,pratiqueDates:['2026-10-19']}).onlineMin).toBe(60);
    expect(JSON.stringify(args)).toBe(before);
  });
});