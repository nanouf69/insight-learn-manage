import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {ExamCardAccess} from './ExamCardAccess';
Element.prototype.scrollIntoView=vi.fn();
vi.mock('./SessionExamAccess',()=>({SessionExamAccess:({sessionId}:{sessionId:string})=><div data-testid="shared-access">{sessionId}</div>}));
const session={id:'fiction-session',nom:'VTC journée',date_debut:'2026-01-01',date_fin:'2099-01-01',types_apprenant:['VTC'],type_session:'theorique'};
const access={verified:true,sessions:[session],catalog:[{exam_id:'EB3',module_id:35}],error:''};
it('removes old selection immediately when excluded; no access command remains',async()=>{
 const v=render(<ExamCardAccess examId="EB3" access={access}/>);
 fireEvent.keyDown(screen.getByRole('combobox'),{key:'ArrowDown'});
 fireEvent.click(await screen.findByRole('option',{name:/VTC journée/}));
 expect(screen.getByTestId('shared-access')).toHaveTextContent('fiction-session');
 v.rerender(<ExamCardAccess examId="EB3" access={{...access,sessions:[{...session,date_fin:'2026-01-02'}]}}/>);
 expect(screen.queryByTestId('shared-access')).toBeNull();
 expect(screen.getByRole('combobox')).toHaveTextContent('Choisir explicitement une session');
});