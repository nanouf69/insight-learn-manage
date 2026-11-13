import {describe,it,expect} from 'vitest';
import {motifPresenceSchema} from '@/lib/motifPresence';
describe('Motif facultatif ajout présence',()=>{
 it('vide enregistré null sans justification inventée',()=>expect(motifPresenceSchema.parse('  ')).toBeNull());
 it('renseigné conservé après espaces externes',()=>expect(motifPresenceSchema.parse('  Cours du soir  ')).toBe('Cours du soir'));
 it('200 caractères maximum',()=>{expect(motifPresenceSchema.safeParse('x'.repeat(200)).success).toBe(true);expect(motifPresenceSchema.safeParse('x'.repeat(201)).success).toBe(false);});
});