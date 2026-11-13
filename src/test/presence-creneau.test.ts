import {describe,it,expect} from 'vitest';
import {projeterPresenceCreneaux,dureePratiqueSchema,commandePresenceCreneauSchema,type PreuvePresenceCreneau} from '@/lib/presenceCreneau';
import type {SignatureManquante} from '@/lib/signaturesManquantes';
const rows:SignatureManquante[]=[{date:'2026-09-17',creneau:'soir_2',horaires:'18h30-21h',source:'Théorie',etat:'manquante'},{date:'2026-09-18',creneau:'soir_1',horaires:'17h-18h30',source:'Théorie',etat:'manquante'},{date:'2026-09-18',creneau:'soir_2',horaires:'18h30-21h',source:'Théorie',etat:'manquante'}];
const p:PreuvePresenceCreneau={id:'p1',apprenantId:'a',sessionId:'s',inscriptionId:'i',date:'2026-09-17',creneau:'soir_2',horaires:'18h30-21h',minutes:150,statut:'validee',auteur:'admin',valideLe:'2026-11-13T14:40:00Z',preuveId:'doc'};
const calc=(preuves:PreuvePresenceCreneau[]=[],validations:any[]=[])=>projeterPresenceCreneaux(rows,preuves,validations,'a','2026-11-13');
describe('Présence exacte sans signature',()=>{
 it('trois créneaux = 390 minutes à signer et justifier',()=>{expect(calc().minutes).toBe(390);expect(calc().minutesAJustifier).toBe(390);expect(calc().details.map(r=>r.minutes)).toEqual([150,90,150]);});
 it('validation exacte réduit justification mais jamais signatures',()=>{expect(calc([p]).minutes).toBe(390);expect(calc([p]).minutesAJustifier).toBe(240);});
 it('deux preuves identiques ne doublent pas',()=>expect(calc([p,p]).minutesPresenceLiee).toBe(150));
 it.each([{...p,apprenantId:'autre'},{...p,horaires:'17h-18h30'},{...p,minutes:90},{...p,statut:'annulee' as const},{...p,auteur:''},{...p,valideLe:'inconnu'}])('preuve étrangère/invalide/annulée exclue %j',v=>expect(calc([v]).minutesAJustifier).toBe(390));
 it('preuve contradictoire signalée non admise',()=>{const r=calc([p,{...p,minutes:90}]);expect(r.minutesAJustifier).toBe(390);expect(r.details[0].revue).toBe(true);});
 it('1h30+4h date-only ne réduisent pas 6h30',()=>{const r=calc([],[{id:'a',date_presence:'2026-09-17',heures:1.5},{id:'b',date_presence:'2026-09-18',heures:4}]);expect(r.minutesAJustifier).toBe(390);expect(r.details.every(d=>d.conflit)).toBe(true);});
 it('preuve exacte et déclaration ancienne restent en revue sans ajout de taux',()=>expect(calc([p],[{date_presence:p.date,heures:1.5}]).details[0].revue).toBe(true));
 it('pratique 0 et 6 admis, négatif et au-delà 6 refusés',()=>{expect(dureePratiqueSchema.parse(0)).toBe(0);expect(dureePratiqueSchema.parse(6)).toBe(6);expect(dureePratiqueSchema.safeParse(-1).success).toBe(false);expect(dureePratiqueSchema.safeParse(6.5).success).toBe(false);});
 it('aucune commande sans session/inscription/formateur/preuve explicites',()=>expect(commandePresenceCreneauSchema.safeParse({minutes:150,date:p.date}).success).toBe(false));
});