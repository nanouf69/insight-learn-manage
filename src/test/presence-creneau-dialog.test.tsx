import {render,screen,fireEvent} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import {ValidationPresenceCreneauDialog} from '@/components/crm/apprenant-sections/ValidationPresenceCreneauDialog';
describe('Confirmation présence aperçu sans transport',()=>{
 it('même avec confirmation et preuve aucune écriture réelle possible',()=>{
  render(<ValidationPresenceCreneauDialog cible={{pratique:false,date:'2026-09-17',horaires:'18h30-21h',minutes:150,conflit:true}} onClose={()=>{}}/>);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByRole('button',{name:'Confirmer la présence'})).toBeDisabled();
 });
});