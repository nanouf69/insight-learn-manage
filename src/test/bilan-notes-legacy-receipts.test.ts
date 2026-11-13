import { describe, expect, it } from 'vitest';
import { modelesBilansNotes, type LegacyBilanReceipt } from '@/lib/notesBilansEleve';
const receipt=(exo:number,patch:Partial<LegacyBilanReceipt>={}):LegacyBilanReceipt=>({id:`receipt-${exo}`,apprenant_id:'fixture',exercice_id:`module_11_exo_${exo}`,status:'submitted',completed:true,submitted_at:'2026-11-10T09:33:08Z',...patch});
describe('historical Bilan submitted receipts (read-only)',()=>{
 it('five real submissions show a Bilan even without frozen or future passage',()=>{
  const result=modelesBilansNotes({future:[],archives:[],legacy:[600,601,602,605,606].map(n=>receipt(n))},[]);
  expect(result).toHaveLength(1);expect(result[0].matieres.map(m=>m.id)).toEqual(['receipt-600','receipt-601','receipt-602','receipt-605','receipt-606']);expect(result[0].note).toBeNull();
 });
 it('draft, incomplete, missing or invalid submission date never implies finished work',()=>{
  expect(modelesBilansNotes({future:[],archives:[],legacy:[receipt(604,{status:'in_progress'}),receipt(603,{completed:false}),receipt(602,{submitted_at:null}),receipt(601,{submitted_at:'bad'})]},[])).toEqual([]);
 });
 it('revisions and other modules do not enter original Bilan history',()=>{
  expect(modelesBilansNotes({future:[],archives:[],legacy:[receipt(600,{exercice_id:'module_11_revision_exo_600'}),receipt(600,{exercice_id:'module_10_exo_600'})]},[])).toEqual([]);
 });
 it('preserves separate original receipts, deduplicates only identical primary key',()=>{
  const result=modelesBilansNotes({future:[],archives:[],legacy:[receipt(600),receipt(600),receipt(600,{id:'other-receipt'})]},[]);
  expect(result[0].matieres).toHaveLength(2);expect(result[0].matieres.every(m=>m.note===null)).toBe(true);
 });
 it('all four Bilan modules supported without manufacturing an exam from other completed modules',()=>{
  const result=modelesBilansNotes({future:[],archives:[],legacy:[5,11,28,30].map(module=>receipt(600,{id:`r-${module}`,exercice_id:`module_${module}_exo_600`}))},[]);
  expect(result.map(r=>r.id).sort()).toEqual(['legacy-11','legacy-28','legacy-30','legacy-5']);
 });
});