import {vi,it,expect,beforeEach} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
const read=vi.hoisted(()=>vi.fn());
vi.mock('./transport',()=>({readSessionAccess:read,ACCESS_NOT_INSTALLED:'not installed'}));
import Control,{sessionAccessState} from './MultiSessionExamAccess';
const choices=['A','B'].map(id=>({id,nom:`Session ${id}`,date_debut:'2026-11-01',date_fin:'2099-11-30',type_session:'theorique',types_apprenant:['VTC'],current:true}));
beforeEach(()=>{read.mockReset();});
it('distingue état habituel, ouvert explicite et fermé sans inférence de date',()=>{
 const c=(opened:boolean|null,operation_id:string|null)=>({session_id:'A',session_name:'A',exams:[{exam_id:'EB6',opened,operation_id,changed_at:null}]});
 expect(sessionAccessState(c(null,null),'EB6').label).toBe('Accès habituel (aucune restriction manuelle)');
 expect(sessionAccessState(c(true,'op'),'EB6').label).toBe('Ouvert');
 expect(sessionAccessState(c(false,'op'),'EB6').label).toBe('Fermé');
 expect(sessionAccessState(c(true,null),'EB6').label).toBe('Non vérifiable');
});
it('RPC absente ne signifie jamais ouvert, sélection multiple mais actions bloquées',async()=>{
 read.mockRejectedValue(new Error('not installed'));render(<Control examId="EB6" choices={choices}/>);
 expect(await screen.findAllByText('Contrôle non installé')).toHaveLength(2);
 screen.getAllByRole('checkbox').forEach(c=>fireEvent.click(c));
 expect(screen.getAllByRole('checkbox').every(c=>c.getAttribute('data-state')==='checked')).toBe(true);
 expect(screen.getByRole('button',{name:'Ouvrir les sessions sélectionnées'})).toBeDisabled();
});
it('états mixtes et noms exacts, confirmation préparée désactivée et relecture',async()=>{
 read.mockImplementation(async(id:string)=>({session_id:id,session_name:`Session ${id}`,exams:[{exam_id:'EB6',opened:id==='A',operation_id:`op-${id}`}]}));
 render(<Control examId="EB6" choices={choices}/>);await screen.findByText('Ouvert');await screen.findByText('Fermé');
 expect(screen.getAllByRole('checkbox').every(c=>c.getAttribute('data-state')==='unchecked')).toBe(true);
 screen.getAllByRole('checkbox').forEach(c=>fireEvent.click(c));fireEvent.click(screen.getByRole('button',{name:'Fermer les sessions sélectionnées'}));
 expect(screen.getByRole('dialog')).toHaveTextContent('EB6');expect(screen.getByRole('dialog')).toHaveTextContent('Session A');expect(screen.getByRole('dialog')).toHaveTextContent('Session B');
 expect(screen.getByRole('button',{name:/Confirmer —/})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Annuler sans modifier les accès'}));
 fireEvent.click(screen.getByRole('button',{name:'Relire les états'}));await screen.findByText('Fermé');expect(read).toHaveBeenCalledTimes(4);
});
it('erreur réseau ou examen absent restent non vérifiables',async()=>{
 read.mockImplementation(async(id:string)=>{if(id==='A')throw new Error('network');return {session_id:id,exams:[]};});
 render(<Control examId="EB6" choices={choices}/>);expect(await screen.findAllByText('Non vérifiable')).toHaveLength(2);
});