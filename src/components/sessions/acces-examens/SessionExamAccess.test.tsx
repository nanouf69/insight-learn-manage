import { describe,it,expect,vi,beforeEach } from 'vitest';
import { render,screen,fireEvent,waitFor } from '@testing-library/react';
const rpc=vi.hoisted(()=>vi.fn());
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc}}));
import {SessionExamAccess} from './SessionExamAccess';
import {readSessionAccess,setSessionAccess,ACCESS_NOT_INSTALLED} from './transport';
const context={session_id:'s1',session_name:'VTC SOIR — NOVEMBRE',exams:[{exam_id:'EB3',opened:null,operation_id:null,changed_at:null}]};
beforeEach(()=>rpc.mockReset());
describe('Accès session examens',()=>{
 it('préparation sans serveur ne propose aucune mutation',async()=>{rpc.mockResolvedValue({error:{code:'PGRST202'}});render(<SessionExamAccess sessionId="s1" sessionName="VTC"/>);await screen.findByText(ACCESS_NOT_INSTALLED);expect(screen.queryByRole('button',{name:'Ouvrir'})).toBeNull();expect(rpc).toHaveBeenCalledTimes(1);});
 it('annuler conserve les accès existants sans écriture',async()=>{rpc.mockResolvedValue({data:context});render(<SessionExamAccess sessionId="s1" sessionName="VTC"/>);fireEvent.click(await screen.findByRole('button',{name:'Fermer'}));fireEvent.click(screen.getByRole('button',{name:'Annuler'}));expect(rpc).toHaveBeenCalledTimes(1);});
 it('confirmation scoped + readback exact, pas de double clic',async()=>{rpc.mockResolvedValueOnce({data:context}).mockImplementation(async(name,args)=>name==='admin_set_session_exam_access'?{data:{operation_id:args.p_operation_id,session_id:'s1',exam_id:'EB3',opened:false}}:{data:{...context,exams:[{...context.exams[0],opened:false,operation_id:rpc.mock.calls[1][1].p_operation_id}]}});render(<SessionExamAccess sessionId="s1" sessionName="VTC"/>);fireEvent.click(await screen.findByRole('button',{name:'Fermer'}));const button=screen.getByRole('button',{name:'Confirmer'});fireEvent.click(button);fireEvent.click(button);await screen.findByText('EB3 : accès fermé, confirmation enregistrée.');expect(rpc.mock.calls.filter(x=>x[0]==='admin_set_session_exam_access')).toHaveLength(1);expect(rpc.mock.calls[1][1]).toMatchObject({p_session_id:'s1',p_exam_id:'EB3',p_opened:false,p_expected_operation_id:null,p_session_name:context.session_name});});
 it('droits refusés ne donnent pas de faux succès',async()=>{rpc.mockResolvedValueOnce({data:context}).mockResolvedValue({error:{code:'42501',message:'Réservé à l’administration.'}});render(<SessionExamAccess sessionId="s1" sessionName="VTC"/>);fireEvent.click(await screen.findByRole('button',{name:'Ouvrir'}));fireEvent.click(screen.getByRole('button',{name:'Confirmer'}));await waitFor(()=>expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));expect(screen.queryByText(/confirmation enregistrée/)).toBeNull();});
 it('lecture refuse une autre session',async()=>{rpc.mockResolvedValue({data:context});await expect(readSessionAccess('s2')).rejects.toThrow('session affichée');});
 it('accusé faux ne confirme pas une ouverture',async()=>{rpc.mockResolvedValue({data:{operation_id:'op',session_id:'s2',exam_id:'EB3',opened:true}});await expect(setSessionAccess(context,context.exams[0],true,'op')).rejects.toThrow('ne correspond pas');});
 it('confirmation non retrouvée reste incertaine',async()=>{rpc.mockResolvedValueOnce({data:{operation_id:'op',session_id:'s1',exam_id:'EB3',opened:true}}).mockResolvedValue({data:context});await expect(setSessionAccess(context,context.exams[0],true,'op')).rejects.toThrow('non retrouvée');});
 it('changer l’examen invalide une confirmation encore ouverte',async()=>{
  rpc.mockResolvedValue({data:{...context,exams:[context.exams[0],{...context.exams[0],exam_id:'EB4'}]}});
  const view=render(<SessionExamAccess sessionId="s1" sessionName="VTC" examId="EB3" compact/>);
  fireEvent.click(await screen.findByRole('button',{name:'Fermer cette session'}));expect(screen.getByRole('dialog')).toHaveTextContent('EB3');
  view.rerender(<SessionExamAccess sessionId="s1" sessionName="VTC" examId="EB4" compact/>);
  await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  expect(rpc.mock.calls.every(c=>c[0]==='admin_session_exam_access_context')).toBe(true);
 });
});