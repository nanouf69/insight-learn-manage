import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {ExamCardAccess} from './ExamCardAccess';
Element.prototype.scrollIntoView=vi.fn();
vi.mock('./transport',()=>({ACCESS_NOT_INSTALLED:'missing',readSessionAccess:async(id:string)=>({session_id:id,session_name:'VTC journée',exams:[{exam_id:'EB3',opened:true,operation_id:'op'}]})}));
const session={id:'fiction-session',nom:'VTC journée',date_debut:'2026-01-01',date_fin:'2099-01-01',types_apprenant:['VTC'],type_session:'theorique'};
const access={verified:true,sessions:[session],catalog:[{exam_id:'EB3',module_id:35}],error:''};
it('removes old selection immediately when excluded; no access command remains',async()=>{
 const v=render(<ExamCardAccess examId="EB3" access={access}/>);
 fireEvent.click(screen.getByRole('checkbox'));
 expect(screen.getByRole('checkbox')).toBeChecked();
 v.rerender(<ExamCardAccess examId="EB3" access={{...access,sessions:[{...session,date_fin:'2026-01-02'}]}}/>);
 expect(screen.queryByRole('checkbox')).toBeNull();
 expect(screen.queryByRole('button',{name:'Ouvrir les sessions sélectionnées'})).toBeNull();
});
