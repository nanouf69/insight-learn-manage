// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const h = vi.hoisted(() => ({ admin: true, eligible: true, rpc: vi.fn(), archive: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: h.admin ? {id:'admin'} : null },error:null }) }, rpc: async () => ({data:h.admin,error:null}) } }));
vi.mock('@/lib/examResetCancellation', () => ({
  exactCancellationContext: (r:any,c:any) => r.reset_id===c.reset_id,
  readArchivedExamResets: async () => { h.archive(); return [{reset_id:'reset-fixture',apprenant_id:'fiction',exam_id:'EB3-TAXI',cutoff_at:'2026-11-11T13:16:10Z',archived_attempt_ids:Array(7).fill('copy'),archived_core_result_ids:Array(7).fill('result'),archived_legacy_result_ids:[]}]; },
  readResetCancellationContext: async (r:any) => {h.rpc();return {...r,eligible:h.eligible,reason:h.eligible?'Copies conservées':'Une nouvelle tentative a commencé.'};},
}));
import ExamensArchivesTab from './ExamensArchivesTab';
function show(){const client=new QueryClient({defaultOptions:{queries:{retry:false}}});return render(<QueryClientProvider client={client}><ExamensArchivesTab account="fiction" nom="Test FICTIF"/></QueryClientProvider>);}
afterEach(()=>{cleanup();h.admin=true;h.eligible=true;h.rpc.mockClear();h.archive.mockClear();});
describe('archives — préparation sans mutation',()=>{
  it('autorise seulement la confirmation simulée et ferme sans enregistrer',async()=>{
    show(); const button=await screen.findByRole('button',{name:'Annuler la remise à zéro'});
    await screen.findByText('Copies conservées');fireEvent.click(button);
    expect(await screen.findByRole('button',{name:'Confirmer l’annulation — non activé'})).toHaveProperty('disabled',true);
    fireEvent.click(screen.getByRole('button',{name:'Fermer sans enregistrer'}));
    expect(screen.queryByRole('dialog')).toBeNull();expect(h.rpc).toHaveBeenCalledTimes(1);
  });
  it('refuse après démarrage',async()=>{h.eligible=false;show();await screen.findByText('Une nouvelle tentative a commencé.');expect(screen.getByRole('button',{name:'Annuler la remise à zéro'})).toHaveProperty('disabled',true);});
  it('ne lit pas les archives pour un apprenant',async()=>{h.admin=false;show();await screen.findByText('Consultation réservée à un administrateur authentifié.');expect(h.archive).not.toHaveBeenCalled();});
});