import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
vi.mock('@/lib/sessionRpc',()=>({freshSessionCall:vi.fn()}));
import { QuizEleveAutonome } from '@/components/quiz-avant-examen-taxi/QuizEleveAutonome';
import { garderOperation, lireOperation, acquitterOperation } from '@/lib/quizAvantExamenTaxi/serveur';
import { construireInventaire } from '@/lib/quizAvantExamenTaxi/inventaire';
import { elearningHoursEvidence } from '@/lib/elearningHoursEvidence';
const items=construireInventaire([{module_id:7,module_data:{exercices:[{id:7001,questions:[{id:1,enonce:'Question fictive',choix:[{lettre:'A',texte:'Oui',correct:true},{lettre:'B',texte:'Non'}]}]}]}}]);
const t={id:'attempt',numero:1,mode:'toutes' as const,parent:null,creeLe:'2026-11-17T10:00:00Z',termineeLe:null,revision:0,cles:[items[0].cle],reponses:{},empreintes:{[items[0].cle]:'server-hash'},note20:0};
afterEach(()=>{cleanup();localStorage.clear();});
describe('Quiz TAXI autonome',()=>{
 it('garde une opération non acquittée sans écraser celle d’un autre compte',()=>{
  const op={operation:'op',tentative:'attempt',action:'answer' as const,revision:0,payload:{lettres:['A']}};
  garderOperation('A',op);expect(lireOperation('A')).toEqual(op);expect(lireOperation('B')).toBeNull();
  expect(()=>garderOperation('A',{...op,operation:'new'})).toThrow();
  acquitterOperation('A',{...op,operation:'old'});expect(lireOperation('A')).toEqual(op);
  acquitterOperation('A',op);expect(lireOperation('A')).toBeNull();
 });
 it('confirme une réponse puis la reprend après remontage du vrai écran',async()=>{
  let saved={...t};
  const transport={lire:vi.fn(async()=>({tentatives:[saved],coursActif:false})),envoyer:vi.fn(async(op:any)=>{
    saved={...saved,revision:1,reponses:{[items[0].cle]:{lettres:op.payload.lettres,empreinte:'server-hash',le:'2026-11-17T10:01:00Z'}}};
    return {tentatives:[saved],coursActif:false};
  })};
  const view=render(<QuizEleveAutonome owner="taxi" items={items} transport={transport}/>);
  const checkbox=await screen.findByRole('checkbox',{name:'Réponse A'});
  await waitFor(()=>expect(checkbox).not.toBeDisabled());fireEvent.click(checkbox);
  await waitFor(()=>expect(checkbox).toBeChecked());expect(transport.envoyer).toHaveBeenCalledTimes(1);
  view.unmount();render(<QuizEleveAutonome owner="taxi" items={items} transport={transport}/>);
  await waitFor(()=>expect(screen.getByRole('checkbox',{name:'Réponse A'})).toBeChecked());
 });
 it('bloque les réponses tant qu’une session cours reste ouverte',async()=>{
  const transport={lire:async()=>({tentatives:[t],coursActif:true}),envoyer:vi.fn()};
  render(<QuizEleveAutonome owner="taxi" items={items} transport={transport}/>);
  expect(await screen.findByRole('checkbox',{name:'Réponse A'})).toBeDisabled();expect(transport.envoyer).not.toHaveBeenCalled();
 });
 it('n’ajoute aucune minute après une session de cours contenant une vraie activité',()=>{
  const input={apprenantId:'test',apprenant:{},acts:[{action_type:'open_cours',module_nom:'Nationale',occurred_at:'2026-11-17T09:10:00Z'}],quizzes:[],exos:[],cnxAll:[{started_at:'2026-11-17T09:00:00Z',ended_at:'2026-11-17T10:00:00Z'}],pratiqueDates:[]};
  const before=elearningHoursEvidence(input); expect(before.onlineMin).toBe(60);
  localStorage.setItem('qaet-pending:v1:test',JSON.stringify({operation:'q',action:'answer',tentative:'t',revision:0,payload:{}}));
  expect(elearningHoursEvidence(input)).toEqual(before);
 });
});