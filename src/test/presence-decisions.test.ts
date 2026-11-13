import {describe,it,expect,vi} from 'vitest';
import {projeterDecisionsPresence,creerControleDecisionPresence,PRESENCE_REVOCATIONS_ACTIVE,AUDIT_REVOCATION_PRESENCE,type PresenceDecision} from '@/lib/presenceRevocations';
import {heuresRestantSigner} from '@/lib/heuresRestantSigner';
import {fusionnerPresenceAdministrative} from '@/lib/presenceAdministrative';
const rows=[{id:'h1',heures:1.5,date_presence:'2026-09-17',categorie:'theorie'},{id:'h2',heures:4,date_presence:'2026-09-18',categorie:'theorie'}];
const d:PresenceDecision={id:'d1',validation_id:'h2',apprenant_id:'a',version:1,action:'annuler',motif:'Erreur saisie',created_at:'2026-11-13T14:00:00Z',created_by:'admin'};
const slots=[{date:'2026-09-17',creneau:'soir_2',horaires:'18h30-21h',source:'theorie',etat:'manquante' as const},{date:'2026-09-18',creneau:'soir_1',horaires:'17h-18h30',source:'theorie',etat:'manquante' as const},{date:'2026-09-18',creneau:'soir_2',horaires:'18h30-21h',source:'theorie',etat:'manquante' as const}];
describe('Présence réversible, preuves et heures non signées',()=>{
 it('trois créneaux de capture restent 390 minutes = 6h30',()=>expect(heuresRestantSigner(slots,'2026-11-13').minutes).toBe(390));
 it('5h30 administratives sans créneau ne réduisent pas les 6h30 à justifier',()=>{
  expect(fusionnerPresenceAdministrative([],rows).minutesAdmin).toBe(330);
  expect(heuresRestantSigner(slots,'2026-11-13').minutesAJustifier).toBe(390);
 });
 it('dédoublonne le même créneau',()=>expect(heuresRestantSigner([...slots,slots[0]],'2026-11-13').minutes).toBe(390));
 it('durées contradictoires = revue sans faux total',()=>expect(heuresRestantSigner([...slots,{...slots[0],horaires:'18h-21h'}],'2026-11-13').minutes).toBeNull());
 it('durée absente = inconnue et non zéro',()=>expect(heuresRestantSigner([{...slots[0],horaires:undefined}],'2026-11-13').minutes).toBeNull());
 it('créneaux futurs hors restant et absences hors signature',()=>expect(heuresRestantSigner([{...slots[0],date:'2027-01-01'},{...slots[1],etat:'absence_enregistree'}],'2026-11-13').minutes).toBe(0));
 it('annule seulement h2 et préserve les originaux',()=>{
  const before=JSON.stringify(rows);const p=projeterDecisionsPresence(rows,[d],'a');
  expect(fusionnerPresenceAdministrative([],p).minutesAdmin).toBe(90);expect(JSON.stringify(rows)).toBe(before);
 });
 it('restauration nouvelle version remet h2 sans double comptage',()=>{
  const p=projeterDecisionsPresence(rows,[{...d,id:'d2',version:2,action:'restaurer'},d],'a');
  expect(fusionnerPresenceAdministrative([{date:'2026-09-17',categorie:'theorie',minutes:90}],p).minutesAdmin).toBe(240);
 });
 it('refuse un journal étranger',()=>expect(()=>projeterDecisionsPresence(rows,[d],'b')).toThrow());
 it('refuse deux événements de même version',()=>expect(()=>projeterDecisionsPresence(rows,[d,{...d,id:'autre'}],'a')).toThrow());
 it('double-clic partage le même envoi',async()=>{
  const t=vi.fn(async()=>d);const send=creerControleDecisionPresence(t);const c={operationId:'op',apprenantId:'a',validationId:'h2',version:0,action:'annuler' as const,motif:'Erreur saisie'};
  await Promise.all([send(c),send(c)]);expect(t).toHaveBeenCalledTimes(1);
 });
 it('refus autorisation propagé sans succès inventé',async()=>{
  const send=creerControleDecisionPresence(async()=>{throw new Error('42501');});
  await expect(send({operationId:'op',apprenantId:'a',validationId:'h2',version:0,action:'annuler',motif:'Erreur saisie'})).rejects.toThrow('42501');
 });
 it('retour autre dossier non confirmé',async()=>{
  const send=creerControleDecisionPresence(async()=>({...d,apprenant_id:'b'}));
  await expect(send({operationId:'op',apprenantId:'a',validationId:'h2',version:0,action:'annuler',motif:'Erreur saisie'})).rejects.toThrow(/non confirmée/);
 });
 it('production inactive',()=>expect(PRESENCE_REVOCATIONS_ACTIVE).toBe(false));
 it('motif vide accepté pour révocation, audit automatique et calcul ciblé confirmés',async()=>{
  const transport=vi.fn(async()=>d);
  const confirmed=await creerControleDecisionPresence(transport)({operationId:'op-sans-motif',apprenantId:'a',validationId:'h2',version:0,action:'annuler',motif:''});
  expect(transport).toHaveBeenCalledWith({operationId:'op-sans-motif',apprenantId:'a',validationId:'h2',version:0,action:'annuler',motif:AUDIT_REVOCATION_PRESENCE});
  expect(fusionnerPresenceAdministrative([],projeterDecisionsPresence(rows,[confirmed],'a')).minutesAdmin).toBe(90);
  expect(confirmed.created_by).toBe('admin');expect(confirmed.created_at).toBe('2026-11-13T14:00:00Z');
 });
});