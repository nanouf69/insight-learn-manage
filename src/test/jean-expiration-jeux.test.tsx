// @vitest-environment jsdom
import { renderHook, waitFor, act } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
const mock=vi.hoisted(()=>({ read:vi.fn(), enqueue:vi.fn(), flush:vi.fn(async()=>true) }));
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
vi.mock('@/lib/sessionRpc',()=>({freshSessionCall:mock.read}));
vi.mock('@/lib/answerPersistence',()=>({enqueueAnswerSave:mock.enqueue,flushAnswerSavesAndWait:mock.flush}));
import { useSuiviJeu } from '@/components/cours-en-ligne/jeux-lyon/useSuiviJeu';
it('rejet lecture montage et après envoi ne prétend jamais jeu terminé',async()=>{
  mock.read.mockRejectedValue({code:'PGRST303',message:'JWT expired'});
  const {result}=renderHook(()=>useSuiviJeu('synthetic-A','synthetic-game'));
  await waitFor(()=>expect(result.current.etat).toBe('lecture_impossible'));
  await act(async()=>{await result.current.enregistrer({answer:'preserved'},true);});
  expect(result.current.etat).toBe('lecture_impossible');
  expect(mock.enqueue).toHaveBeenCalledWith(expect.objectContaining({reponses:{answer:'preserved'}}));
});