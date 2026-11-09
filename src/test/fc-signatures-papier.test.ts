import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
import { preuvePapierComplete } from '@/lib/fcSignaturesPapier';
import { calculerSignaturesManquantes, calculerBilanSignaturesEdof } from '@/lib/signaturesManquantes';
const sessions=[{sessions:{type_session:'theorique',nom:'Formation Continue VTC',date_debut:'2026-09-29',date_fin:'2026-09-30',heure_debut:'09:00',heure_fin:'17:00'}}];
const papier=[{date_emargement:'2026-09-29',demi_journee:'matin',heures:3,preuve_papier:true},{date_emargement:'2026-09-29',demi_journee:'apres_midi',heures:4,preuve_papier:true},{date_emargement:'2026-09-30',demi_journee:'matin',heures:3,preuve_papier:true},{date_emargement:'2026-09-30',demi_journee:'apres_midi',heures:4,preuve_papier:true}];
describe('Preuves papier FC',()=>{
 it('4 créneaux complets suppriment les 4 signatures manquantes',()=>{
  expect(calculerSignaturesManquantes([],sessions,[],'2026-11-09')).toHaveLength(4);
  expect(calculerSignaturesManquantes(papier,sessions,[],'2026-11-09')).toHaveLength(0);
 });
 it('heures partielles et valeurs non signées ne prouvent pas un créneau complet',()=>{
  expect(preuvePapierComplete({...papier[0],heures:2})).toBe(false);
  expect(preuvePapierComplete({...papier[0],preuve_papier:false})).toBe(false);
  expect(calculerSignaturesManquantes([...papier.slice(0,3),{...papier[3],heures:2}],sessions,[],'2026-11-09')).toHaveLength(1);
 });
 it('papier et numérique ne doublent pas le compteur',()=>{
  const digital={date_emargement:'2026-09-29',demi_journee:'matin',signature_data_url:'data:image/png;base64,AAAA'};
  expect(calculerBilanSignaturesEdof([...papier,digital],sessions,[],'VTC').total).toBe(4);
 });
});