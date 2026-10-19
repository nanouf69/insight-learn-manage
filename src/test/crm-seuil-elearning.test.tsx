import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { filtrerSeuilsElearning, seuilElearning } from '@/lib/seuilElearning';
const state=vi.hoisted(()=>({hours:{loading:false,faitHeures:20,requis:60,pct:33,formattedDone:'20h00',formattedRemaining:'40h00'}}));
vi.mock('@/hooks/useStudentEffectiveHours',()=>({useStudentEffectiveHours:()=>state.hours}));
import StudentHoursTracker from '@/components/cours-en-ligne/StudentHoursTracker';

describe('Filtre et rappel non bloquants',()=>{
  beforeEach(()=>{cleanup();state.hours={loading:false,faitHeures:20,requis:60,pct:33,formattedDone:'20h00',formattedRemaining:'40h00'};});
  it('filtre avant découpe et exclut les lectures inconnues',()=>{
    const rows=Array.from({length:100},(_,i)=>({id:String(i)}));
    const seuils={'90':seuilElearning({type_apprenant:'vtc-e'},20,60),'91':seuilElearning({type_apprenant:'vtc-e'},0,60,false)};
    expect(filtrerSeuilsElearning(rows,seuils,true).slice(0,80)).toEqual([{id:'90'}]);
    expect(filtrerSeuilsElearning(rows,seuils,false)).toHaveLength(100);
  });
  it('dernière validation confirmée sous seuil : continuer reste possible, rappel unique',async()=>{
    const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
    client.setQueryData(['apprenant-taux-realisation','fictif'],{doneElearning:20,reqElearning:60});
    const memory={current:{owner:'fictif',total:2,termines:1}};
    render(<QueryClientProvider client={client}><StudentHoursTracker apprenantId="fictif" typeApprenant="vtc-e" modulesCompleted={2} modulesTotal={2} progressionMemory={memory}/></QueryClientProvider>);
    await waitFor(()=>expect(screen.getByRole('dialog')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button',{name:'Continuer'}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(memory.current.termines).toBe(2);client.clear();
  });
  it('erreur de lecture : aucun rappel final',()=>{
    state.hours.loading=true;
    const client=new QueryClient();
    render(<QueryClientProvider client={client}><StudentHoursTracker apprenantId="fictif" typeApprenant="vtc-e" modulesCompleted={2} modulesTotal={2}/></QueryClientProvider>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();client.clear();
  });
  it('double montage : la dernière confirmation conserve le rappel', async () => {
    const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
    client.setQueryData(['apprenant-taux-realisation','fictif'],{doneElearning:20,reqElearning:60});
    const memory = {current:{owner:'fictif',total:2,termines:1}};
    render(<StrictMode><QueryClientProvider client={client}><StudentHoursTracker apprenantId="fictif" typeApprenant="vtc-e" modulesCompleted={2} modulesTotal={2} progressionMemory={memory}/></QueryClientProvider></StrictMode>);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(memory.current.termines).toBe(2);
    client.clear();
  });
});