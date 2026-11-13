// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const h = vi.hoisted(() => ({ fail: false, noWelcome: false, account: 'admin-fictif', reads: [] as string[] }));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 auth:{getSession:async()=>({data:{session:{user:{id:h.account}}},error:null})},
 from:(table:string)=>{
  h.reads.push(table);
  const chain:any={select:()=>chain,eq:()=>chain,not:()=>chain,order:()=>chain,limit:()=>Promise.resolve({error:h.fail?new Error('offline'):null,data:table==='renouvellements'?[{id:'kia-fictif',libelle:'KIA Sportage — HK-870-BF',reference:'VIN U5YPX81GBSL278919',date_debut:'2026-03-31',date_echeance:'2030-03-31'}]:h.noWelcome?[]:[{id:'welcome-fictif',apprenant_id:'learner-fictif',completed_at:'2026-04-30T09:56:12Z',nom:'Sow',prenom:'Mamadou',email:'test@example.test',telephone:''}]})};return chain;
 },
}}));
vi.mock('./LocationPdfPreview',()=>({LocationPdfPreview:()=>null}));
import { ContratLocationSection } from './ContratLocationSection';
const learner={id:'learner-fictif',nom:'CRM DIFFERENT',prenom:'Ne pas copier',email:'autre@example.test'};
afterEach(()=>{cleanup();h.fail=false;h.noWelcome=false;h.reads=[];});
describe('rental integration fixtures',()=>{
 it('reads the completed dossier rather than unrelated CRM fields',async()=>{
  render(<ContratLocationSection apprenant={learner}/>);
  await screen.findByDisplayValue('Mamadou Sow');
  expect(screen.getByDisplayValue('test@example.test')).toBeTruthy();
  expect(screen.queryByDisplayValue('autre@example.test')).toBeNull();
  expect(h.reads).toEqual(['apprenant_documents_completes','renouvellements']);
 });
 it('loading the fleet never replaces the currently selected Sharan',async()=>{
  render(<ContratLocationSection apprenant={learner}/>);await screen.findByDisplayValue('Mamadou Sow');
  expect(screen.getByDisplayValue('Volkswagen Sharan')).toBeTruthy();expect(screen.getByDisplayValue('FL-511-KH')).toBeTruthy();
 });
 it('a fresh dossier read cannot erase admin contact edits',async()=>{
  render(<ContratLocationSection apprenant={learner}/>);
  fireEvent.change(await screen.findByDisplayValue('Mamadou Sow'),{target:{value:'Correction locale'}});
  fireEvent.click(screen.getByRole('button',{name:'Relire le dossier et le parc'}));
  await waitFor(()=>expect(h.reads).toHaveLength(4));
  expect(screen.getByDisplayValue('Correction locale')).toBeTruthy();
 });
 it('read failure preserves CRM prefill and permits explicit retry',async()=>{
  h.fail=true;render(<ContratLocationSection apprenant={learner}/>);
  await screen.findByRole('alert');expect(screen.queryByDisplayValue('Mamadou Sow')).toBeNull();
  expect(screen.getByLabelText('Nom et Prénom')).toHaveProperty('value','Ne pas copier CRM DIFFERENT');
  expect(screen.getByLabelText('E-mail')).toHaveProperty('value','autre@example.test');
  h.fail=false;fireEvent.click(screen.getByRole('button',{name:'Relire le dossier et le parc'}));
  await screen.findByDisplayValue('Mamadou Sow');expect(screen.queryByRole('alert')).toBeNull();
 });
 it('prefills every learner without a completed welcome document',async()=>{
  h.noWelcome=true;
  render(<ContratLocationSection apprenant={{id:'learner-fictif',nom:'Martin',prenom:'Lea',email:'lea@example.test',telephone:'0102030405',adresse:'12 rue Test',code_postal:'69003',ville:'Lyon',date_naissance:'1990-06-15'}}/>);
  await waitFor(()=>expect(screen.queryByRole('status')).toBeNull());
  expect(screen.getByLabelText('Nom et Prénom')).toHaveProperty('value','Lea Martin');
  expect(screen.getByLabelText('Adresse complète')).toHaveProperty('value','12 rue Test, 69003, Lyon');
  expect(screen.getByLabelText('Date de naissance')).toHaveProperty('value','1990-06-15');
  expect(screen.getByLabelText('Téléphone')).toHaveProperty('value','0102030405');
  expect(screen.queryByRole('alert')).toBeNull();
 });
 it('fills missing welcome fields from this CRM dossier only',async()=>{
  render(<ContratLocationSection apprenant={{...learner,telephone:'0102030405',adresse:'12 rue Test',ville:'Lyon'}}/>);
  await screen.findByDisplayValue('Mamadou Sow');
  expect(screen.getByLabelText('Téléphone')).toHaveProperty('value','0102030405');
  expect(screen.getByLabelText('Adresse complète')).toHaveProperty('value','12 rue Test, Lyon');
 });
 it('switching learners clears local edits and ignores another learner welcome',async()=>{
  const {rerender}=render(<ContratLocationSection apprenant={learner}/>);
  fireEvent.change(await screen.findByDisplayValue('Mamadou Sow'),{target:{value:'Local edit'}});
  rerender(<ContratLocationSection apprenant={{id:'second-fictif',nom:'Durand',prenom:'Paul',email:'paul@example.test'}}/>);
  await waitFor(()=>expect(screen.queryByRole('status')).toBeNull());
  expect(screen.getByLabelText('Nom et Prénom')).toHaveProperty('value','Paul Durand');
  expect(screen.getByLabelText('E-mail')).toHaveProperty('value','paul@example.test');
  expect(screen.queryByDisplayValue('Local edit')).toBeNull();
  expect(screen.queryByDisplayValue('test@example.test')).toBeNull();
 });
});