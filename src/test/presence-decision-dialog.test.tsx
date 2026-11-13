import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import {PresenceDecisionDialog} from '@/components/crm/apprenant-sections/PresenceDecisionDialog';
const cible={id:'h2',heures:4,date:'2026-09-18',categorie:'theorie',annulee:false,version:0};
describe('Confirmation présence',()=>{
 it('aucune écriture réelle sans transport installé',()=>{
  render(<PresenceDecisionDialog cible={cible} apprenantId="a" onClose={()=>{}} onConfirmed={()=>{}}/>);
  expect(screen.getByRole('button',{name:'Oui, supprimer'})).toBeDisabled();
 });
 it('double-clic et confirmation seulement après retour exact',async()=>{
  let resolve:((v:any)=>void)|undefined;const transport=vi.fn(()=>new Promise<any>(r=>{resolve=r;}));const confirmed=vi.fn();
  render(<PresenceDecisionDialog cible={cible} apprenantId="a" transport={transport} onClose={()=>{}} onConfirmed={confirmed}/>);
  const b=screen.getByRole('button',{name:'Oui, supprimer'});fireEvent.click(b);fireEvent.click(b);
  expect(transport).toHaveBeenCalledTimes(1);expect(confirmed).not.toHaveBeenCalled();
  resolve?.({id:'d',validation_id:'h2',apprenant_id:'a',version:1,action:'annuler',motif:'Erreur saisie',created_by:'admin',created_at:'2026-11-13'});
  await waitFor(()=>expect(confirmed).toHaveBeenCalledTimes(1));
 });
 it('annuler la confirmation ne révoque rien',()=>{
  const close=vi.fn(),transport=vi.fn(),confirmed=vi.fn();
  render(<PresenceDecisionDialog cible={cible} apprenantId="a" transport={transport} onClose={close} onConfirmed={confirmed}/>);
  fireEvent.click(screen.getByRole('button',{name:'Annuler'}));
  expect(close).toHaveBeenCalledTimes(1);expect(transport).not.toHaveBeenCalled();expect(confirmed).not.toHaveBeenCalled();
 });
 it('changement de ligne en cours : aucune actualisation du mauvais dossier',async()=>{
  let resolve:((v:any)=>void)|undefined;const transport=vi.fn(()=>new Promise<any>(r=>{resolve=r;}));const confirmed=vi.fn();
  const props={apprenantId:'a',transport,onClose:vi.fn(),onConfirmed:confirmed};
  const {rerender}=render(<PresenceDecisionDialog {...props} cible={cible}/>);
  fireEvent.click(screen.getByRole('button',{name:'Oui, supprimer'}));
  rerender(<PresenceDecisionDialog {...props} cible={{...cible,id:'h1',heures:1.5}}/>);
  resolve?.({id:'d',validation_id:'h2',apprenant_id:'a',version:1,action:'annuler',created_by:'admin',created_at:'2026-11-13'});
  await waitFor(()=>expect(screen.getByRole('button',{name:'Oui, supprimer'})).toBeEnabled());
  expect(confirmed).not.toHaveBeenCalled();expect(transport.mock.calls[0][0].validationId).toBe('h2');
 });
 it('restauration et refus de permission ne modifient aucun total',async()=>{
  const confirmed=vi.fn();render(<PresenceDecisionDialog cible={{...cible,annulee:true,version:1}} apprenantId="a" transport={async()=>{throw new Error('42501');}} onClose={()=>{}} onConfirmed={confirmed}/>);
  fireEvent.change(screen.getByLabelText('Motif de la décision'),{target:{value:'Présence vérifiée'}});fireEvent.click(screen.getByRole('button',{name:'Confirmer la restauration'}));
  await waitFor(()=>expect(screen.getByRole('alert')).toBeTruthy());expect(confirmed).not.toHaveBeenCalled();
 });
});