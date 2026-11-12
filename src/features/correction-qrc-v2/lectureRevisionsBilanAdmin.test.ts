import { expect,it,vi } from 'vitest';
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{const q:any={select:()=>q,eq:()=>q,order:()=>q,range:async()=>({data:[{id:'r',apprenant_id:'owner',exercice_id:'bilan_revision_5_502_copy',reponses:{__source:{owner:'owner',module:5,exercise:502,questions:['71','226']},'71':['A','C'],'226':'texte exact'},status:'submitted',submitted_at:'2026-11-12T16:49:00Z',updated_at:'2026-11-12T16:49:00Z'}],error:null})};return q;}}}));
import {lireRevisionsBilanAdmin} from './lectureRevisionsBilanAdmin';
it('admin lit les dernières réponses persistées sans emprunter réponse ou note originale',async()=>{
 const rows=await lireRevisionsBilanAdmin('owner');expect(rows.map(r=>r.derniere)).toEqual([['A','C'],'texte exact']);expect(rows.every(r=>r.initiale===undefined&&r.sourceId===null)).toBe(true);expect(rows.every(r=>r.terminee)).toBe(true);
 expect(await lireRevisionsBilanAdmin('other')).toEqual([]);
});