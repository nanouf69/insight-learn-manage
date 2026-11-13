import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import {PresenceDecisionDialog} from '@/components/crm/apprenant-sections/PresenceDecisionDialog';
const cible={id:'h2',heures:4,date:'2026-09-18',categorie:'theorie',annulee:false,version:0};
describe('Confirmation présence',()=>{
 it('aucune écriture réelle sans transport installé',()=>{
  render(<PresenceDecisionDialog cible={cible} apprenantId="a" onClose={()=>{}} onConfirmed={()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Motif de la décision'),{target:{value:'Erreur saisie'}});
  expect(screen.getByRole('button',{name:'Confirmer l’annulation'})).toBeDisabled();
 });
 it('double-clic et confirmation seulement après retour exact',async()=>{
  let resolve:((v:any)=>void)|undefined;const transport=vi.fn(()=>new Promise<any>(r=>{resolve=r;}));const confirmed=vi.fn();
  render(<PresenceDecisionDialog cible={cible} apprenantId="a" transport={transport} onClose={()=>{}} onConfirmed={confirmed}/>);
  fireEvent.change(screen.getByLabelText('Motif de la décision'),{target:{value:'Erreur saisie'}});
  const b=screen.getByRole('button',{name:'Confirmer l’annulation'});fireEvent.click(b);fireEvent.click(b);
  expect(transport).toHaveBeenCalledTimes(1);expect(confirmed).not.toHaveBeenCalled();
  resolve?.({id:'d',validation_id:'h2',apprenant_id:'a',version:1,action:'annuler',motif:'Erreur saisie',created_by:'admin',created_at:'2026-11-13'});
  await waitFor(()=>expect(confirmed).toHaveBeenCalledTimes(1));
 });
 it('restauration et refus de permission ne modifient aucun total',async()=>{
  const confirmed=vi.fn();render(<PresenceDecisionDialog cible={{...cible,annulee:true,version:1}} apprenantId="a" transport={async()=>{throw new Error('42501');}} onClose={()=>{}} onConfirmed={confirmed}/>);
  fireEvent.change(screen.getByLabelText('Motif de la décision'),{target:{value:'Présence vérifiée'}});fireEvent.click(screen.getByRole('button',{name:'Confirmer la restauration'}));
  await waitFor(()=>expect(screen.getByRole('alert')).toBeTruthy());expect(confirmed).not.toHaveBeenCalled();
 });
});