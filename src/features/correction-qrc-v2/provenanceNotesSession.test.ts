import { expect,it } from 'vitest';
import { sourceAttenteMatiere } from './notesSession';
import { lienCorrectionSession } from './lienCorrectionSession';
const liens=[{session:{id:'taxi',nom:'TAXI/TA',date_debut:'2026-10-26',date_fin:'2026-11-16'},debut:'2026-10-26',fin:'2026-11-16'},{session:{id:'vtc',nom:'VTC/TAXI',date_debut:'2026-11-02',date_fin:'2026-11-13'},debut:'2026-11-02',fin:'2026-11-13'}];
const row={id:'result-prouve',quiz_id:'EB4-TAXI',__core:{provenResultIds:['result-prouve'],attemptId:'national-30',finishedAt:'2026-10-30T14:32:28Z',qrcRestantes:4}};
it('le relevé VTC/TAXI ouvre la copie nationale du 30/10 dans TAXI/TA, pas celle du 11/11',()=>{
 const s=sourceAttenteMatiere(row,liens,'crm:vtc','taxi');
 expect(s.destinations).toHaveLength(1);
 expect(s.destinations[0]).toMatchObject({sessionCle:'crm:taxi',jour:'2026-10-30',attemptId:'national-30',qrcRestantes:4});
 expect(new URL(lienCorrectionSession('crm:taxi','EB4-TAXI','stable',s.destinations[0]),'http://localhost').searchParams.get('qrc_eb')).toBe('crm:taxi::EB4-TAXI');
});
it('plusieurs sessions prouvées ne sont pas réduites à un choix arbitraire',()=>{
 expect(sourceAttenteMatiere({...row,__core:{...row.__core,finishedAt:'2026-11-11T14:00:00Z'}},liens,'crm:ailleurs','taxi').destinations.map(d=>d.sessionCle)).toEqual(['crm:taxi','crm:vtc']);
});
it('aucune QRC restante donne un motif publication sans lien vide',()=>{
 expect(sourceAttenteMatiere({...row,__core:{...row.__core,qrcRestantes:0}},liens,'crm:vtc','taxi')).toEqual({destinations:[],motif:'publication'});
});
it('identité ou session non prouvée ne construit pas de passage arbitraire',()=>{
 expect(sourceAttenteMatiere({quiz_id:'EB4-TAXI'},liens,'crm:vtc','taxi').destinations).toEqual([]);
 expect(sourceAttenteMatiere({...row,id:'autre-resultat'},liens,'crm:vtc','taxi').destinations).toEqual([]);
 expect(sourceAttenteMatiere(row,[],'crm:vtc','taxi').motif).toBe('ambigue');
});