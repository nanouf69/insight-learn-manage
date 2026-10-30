import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModifierReinscription } from '@/components/crm/apprenant-sections/ModifierReinscription';
import { ReactiverPlateformeTab } from '@/components/crm/apprenant-sections/ReactiverPlateformeTab';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), rows: [] as any[], choix: [] as any[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc, from: () => {
  const chain: any = { select: () => chain, eq: () => chain, order: () => chain, single: async () => ({ data: mocks.rows[0], error: null }), then: (resolve: any) => Promise.resolve({data: mocks.rows,error:null}).then(resolve) };return chain;
} } }));
vi.mock('@/lib/crmActionsEleve', () => ({ lireChoixAdmin: async () => mocks.choix }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const wrap = (element: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>{element}</QueryClientProvider>);
beforeEach(() => { mocks.rpc.mockReset();mocks.rows=[];mocks.choix=[]; });
describe('Commandes individuelles sans mutation des preuves', () => {
  it('Oui confirmé utilise un seul reçu, même avec double clic', async () => {
    mocks.rpc.mockImplementation(async (_name,args) => { mocks.choix=[{id:'receipt',operation_id:args.p_operation,choix:args.p_choix,created_at:'2026-10-30T10:00:00Z'}];return {data:mocks.choix[0],error:null}; });
    wrap(<ModifierReinscription apprenantId="a" examen="2026-11-17" />);
    fireEvent.click(screen.getByRole('button',{name:/Réinscription examen/}));
    await waitFor(()=>expect(screen.getByRole('button',{name:'Confirmer le choix'})).toBeDisabled());
    fireEvent.click(screen.getAllByRole('checkbox')[0]);const confirm=screen.getByRole('button',{name:'Confirmer le choix'});
    fireEvent.click(confirm);fireEvent.click(confirm);
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledTimes(1));
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({p_choix:'oui',p_apprenant:'a',p_examen:'2026-11-17'});
  });
  it('réactivation confirme exactement la proposition serveur et une seule fois', async () => {
    const p={debut:'2026-10-30',fin:'2026-11-30',fin_precedente:'2026-10-01'};
    mocks.rpc.mockImplementation(async(name,args)=>{
      if(name==='crm_preparer_reactivation')return {data:p,error:null};
      mocks.rows=[{id:'r',operation_id:args.p_operation,...p,created_at:'2026-10-30T10:00:00Z'}];return {data:mocks.rows[0],error:null};
    });
    wrap(<ReactiverPlateformeTab apprenantId="a"/>);
    fireEvent.click(await screen.findByRole('button',{name:'Réactiver pour un mois'}));
    const confirm=screen.getByRole('button',{name:'Confirmer la réactivation'});fireEvent.click(confirm);fireEvent.click(confirm);
    await waitFor(()=>expect(mocks.rpc.mock.calls.filter(c=>c[0]==='crm_reactiver_un_mois')).toHaveLength(1));
    expect(mocks.rpc.mock.calls.find(c=>c[0]==='crm_reactiver_un_mois')?.[1]).toMatchObject({p_apprenant:'a',p_fin_precedente:'2026-10-01',p_fin_confirmee:'2026-11-30'});
  });
  it('lecture refusée ne permet aucune réactivation', async()=>{
    mocks.rpc.mockResolvedValue({data:null,error:new Error('Lecture impossible')});wrap(<ReactiverPlateformeTab apprenantId="a"/>);
    await screen.findByText('Lecture impossible');expect(screen.queryByRole('button',{name:'Réactiver pour un mois'})).toBeNull();
  });
  it('panne réseau conserve l’identité et les dates de la même confirmation', async()=>{
    const p={debut:'2026-10-30',fin:'2026-11-30',fin_precedente:'2026-10-01'};
    let attempts=0;
    mocks.rpc.mockImplementation(async(name,args)=>{
      if(name==='crm_preparer_reactivation')return {data:p,error:null};
      attempts++;if(attempts===1)return {data:null,error:new Error('Réseau indisponible')};
      mocks.rows=[{id:'r',operation_id:args.p_operation,...p,created_at:'2026-10-30T10:00:00Z'}];return {data:mocks.rows[0],error:null};
    });
    wrap(<ReactiverPlateformeTab apprenantId="a"/>);fireEvent.click(await screen.findByRole('button',{name:'Réactiver pour un mois'}));
    fireEvent.click(screen.getByRole('button',{name:'Confirmer la réactivation'}));
    await waitFor(()=>expect(screen.getByRole('button',{name:'Confirmer la réactivation'})).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button',{name:'Confirmer la réactivation'}));
    await waitFor(()=>expect(mocks.rpc.mock.calls.filter(c=>c[0]==='crm_reactiver_un_mois')).toHaveLength(2));
    const calls=mocks.rpc.mock.calls.filter(c=>c[0]==='crm_reactiver_un_mois');expect(calls[0][1]).toEqual(calls[1][1]);
  });
});