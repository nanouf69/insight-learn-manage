import {vi,it,expect,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
Element.prototype.scrollIntoView=vi.fn();
const mock=vi.hoisted(()=>({role:true,user:true,rpc:vi.fn(),reads:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:async()=>({data:{user:mock.user?{id:'admin-fictif'}:null}})},rpc:async(name:string,args:unknown)=>name==='has_role'?{data:mock.role}:mock.rpc(name,args),from:(table:string)=>({select(){return this;},in(){return this;},order(){return this;},range:mock.reads,then(resolve:any){return Promise.resolve({data:table==='examens_blancs_parcours'?[{exam_id:'EB3',module_id:35}]:[]}).then(resolve);}})}}));
vi.mock('@/hooks/useCoreChangeTick',()=>({useCoreChangeTick:()=>0}));
vi.mock('@/hooks/useQrcEnginePending',()=>({useQrcEnginePending:()=>({})}));
import {EcranSelection} from '@/components/cours-en-ligne/ExamenBlancsListe';
const exam={id:'EB3',titre:'Examen blanc N°3',type:'VTC',matieres:[],numero:3} as any;
const pause=vi.fn();
function renderList(admin=true,withPause=true){return render(<EcranSelection isAdmin={admin} examensData={[exam]} onStart={vi.fn()} onStartPartial={vi.fn()} onEdit={vi.fn()} onViewResults={vi.fn()} onPauseToggle={withPause?pause:undefined}/>);}
beforeEach(()=>{mock.role=true;mock.user=true;mock.rpc.mockReset();mock.reads.mockReset();mock.reads.mockResolvedValue({data:[{id:'s1',nom:'VTC SOIR',date_debut:'2026-11-01',date_fin:'2099-11-20',types_apprenant:['VTC'],type_session:'theorique'}]});pause.mockReset();});
it('commande après pause, sans sélection ni mutation',async()=>{renderList();const label=await screen.findByText('Accès présentiel — EB3');const p=screen.getByRole('button',{name:'Mettre en pause'});expect(p.compareDocumentPosition(label)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();expect(screen.getByRole('checkbox')).not.toBeChecked();fireEvent.click(p);expect(pause).toHaveBeenCalledWith('EB3');});
it('sans pause commande après la dernière action',async()=>{renderList(true,false);const label=await screen.findByText('Accès présentiel — EB3');expect(screen.getByRole('button',{name:/Choisir les matières/}).compareDocumentPosition(label)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();});
it('apprenant ne voit jamais la commande ni lecture sessions',async()=>{renderList(false);expect(screen.queryByText('Accès présentiel — EB3')).toBeNull();expect(mock.reads).not.toHaveBeenCalled();});
it('prop admin sans rôle serveur ne suffit pas',async()=>{mock.role=false;renderList();await waitFor(()=>expect(screen.queryByText('Accès présentiel — EB3')).toBeNull());expect(mock.reads).not.toHaveBeenCalled();});
it('admin déconnecté ne reçoit pas la commande',async()=>{mock.user=false;renderList();expect(screen.queryByText('Accès présentiel — EB3')).toBeNull();expect(mock.reads).not.toHaveBeenCalled();});
it('lit la même source exacte et bloque une absence de RPC',async()=>{mock.rpc.mockResolvedValue({error:{code:'PGRST202'}});renderList();await screen.findByText('Contrôle non installé');expect(mock.rpc.mock.calls[0]).toEqual(['admin_session_exam_access_context',{p_session_id:'s1'}]);fireEvent.click(screen.getByRole('checkbox'));expect(screen.getByRole('button',{name:'Ouvrir cette session'})).toBeDisabled();});
