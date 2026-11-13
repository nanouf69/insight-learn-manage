import {render,screen,fireEvent} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import {ValidationPresenceCreneauDialog} from '@/components/crm/apprenant-sections/ValidationPresenceCreneauDialog';
import {bornesHoraire,dureeLisible,libelleHoraire} from '@/lib/presenceCreneauTransport';
describe('Validation présence par créneau',()=>{
 it('sans inscription vérifiée ni PDF, la confirmation reste impossible',()=>{
  render(<ValidationPresenceCreneauDialog cible={{pratique:false,date:'2026-09-17',creneau:'Soir 2 (18h30-21h)',horaires:'18h30-21h',minutes:150}} onClose={()=>{}}/>);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByRole('button',{name:'Confirmer la présence'})).toBeDisabled();
 });
 it('durée affichée sans ambiguïté : 18h30 à 21h = 2 h 30',()=>{
  const b=bornesHoraire('18h30-21h')!;
  expect(b).toEqual({debut:'18:30',fin:'21:00'});
  expect(libelleHoraire(b)).toBe('18h30 à 21h');
  expect(dureeLisible(150)).toBe('2 h 30');
  expect(dureeLisible(240)).toBe('4 h');
 });
 it('plage invalide refusée',()=>expect(bornesHoraire('21h-18h30')).toBeNull());
});
