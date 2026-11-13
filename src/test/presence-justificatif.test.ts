import {it,expect,describe} from 'vitest';
import {verifierPdfPresence,PRESENCE_PDF_MAX_BYTES,retrouverInscriptionPresence,justificatifPresenceSchema} from '@/lib/presenceJustificatif';
const make=(text='%PDF-1.4\n%%EOF',type='application/pdf',name='preuve.pdf')=>{const bytes=new TextEncoder().encode(text);return {name,type,size:bytes.length,arrayBuffer:async()=>bytes.buffer};};
const ins={id:'i',session_id:'s',sessions:{id:'s',type_session:'theorique',nom:'Cours soir',date_debut:'2026-09-14',date_fin:'2026-09-27',heure_debut:'17:00',heure_fin:'21:00'}};
const cible={date:'2026-09-17',creneau:'soir_2',horaires:'18h30-21h',pratique:false};
describe('Justificatif local et inscription exacte',()=>{
 it('PDF entête/fin corrects accepté localement',async()=>expect(await verifierPdfPresence(make())).toBeTruthy());
 it.each([make('png'),make('%PDF-1.4'),make(undefined,'image/png'),make(undefined,undefined,'a.png')])('faux PDF refusé',async f=>await expect(verifierPdfPresence(f)).rejects.toThrow());
 it('plus de 4 Mo refusé avant lecture',async()=>await expect(verifierPdfPresence({...make(),size:PRESENCE_PDF_MAX_BYTES+1})).rejects.toThrow());
 it('rattachement unique exact',()=>expect(retrouverInscriptionPresence([ins],cible,'VTC').inscription?.id).toBe('i'));
 it('deux inscriptions même plage refusées',()=>expect(retrouverInscriptionPresence([ins,{...ins,id:'i2'}],cible,'VTC').inscription).toBeNull());
 it('décalage horaire refusé même durée',()=>expect(retrouverInscriptionPresence([ins],{...cible,horaires:'18h-20h30'},'VTC').inscription).toBeNull());
 it('session annulée refusée',()=>expect(retrouverInscriptionPresence([{...ins,sessions:{...ins.sessions,statut:'annulee'}}],cible,'VTC').inscription).toBeNull());
 it('pas de pratique inventée',()=>expect(retrouverInscriptionPresence([ins],{...cible,pratique:true},'VTC').inscription).toBeNull());
 it('Autre exige libellé sans fichier obligatoire',()=>{expect(justificatifPresenceSchema.safeParse({type:'autre',libelle:''}).success).toBe(false);expect(justificatifPresenceSchema.safeParse({type:'feuille',libelle:''}).success).toBe(true);});
});