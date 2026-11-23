// Fictional read transport: no hosted account, request or mutation.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '@/integrations/supabase/client';
import EmargementsSignesViewer from '@/components/cours-en-ligne/EmargementsSignesViewer';
import RemboursementFCViewer from '@/components/cours-en-ligne/RemboursementFCViewer';
import '@/index.css';
const params = new URLSearchParams(location.search);
const period = params.get('period') ?? 'octobre';
const admin = params.get('role') === 'admin';
const id = `fictif-${period}`;
const dates = period === 'octobre' ? ['2026-10-28', '2026-10-29'] : ['2026-11-17', '2026-11-18'];
const slots = dates.flatMap(date => ['matin', 'apres_midi'].map(creneau => ({ date, creneau })));
// Generated transparent one-pixel fixture, never a real signature.
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=';
const rows = period === 'octobre' ? slots.map((s, i) => ({ id: `fixture-${i}`, date_emargement: s.date, demi_journee: s.creneau, signature_data_url: image, signed_at: '2026-11-17T12:15:00Z', absent: false })) : [];
let extra = false;
Object.assign(window, { fixtureConfirmRead: () => { extra = true; } });
supabase.auth.getSession = async () => ({ data: { session: { user: { id: admin ? 'admin-fictif' : 'eleve-fictif' }, access_token: 'fixture', refresh_token: 'fixture', expires_at: Math.floor(Date.now()/1000) + 86400 } }, error: null } as any);
(supabase as any).from = (table: string) => {
  const q: any = {};
  const result = () => ({ data: table === 'apprenants' ? { auth_user_id: 'eleve-fictif', nom: 'EXEMPLE FICTIF', prenom: 'Camille', formation_choisie: 'continue-vtc', type_apprenant: 'continue-vtc', date_debut_formation: dates[0], date_fin_formation: dates[1] } : table === 'emargements_fc' ? extra ? [...rows, { id:'fixture-confirmed',date_emargement:dates[0],demi_journee:'matin',signature_data_url:image,signed_at:'2026-11-23T15:00:00Z' }] : rows : [], error: null });
  for (const name of ['select','eq','order','range','in','filter']) q[name] = () => q;
  q.maybeSingle = async () => result();
  q.then = (resolve: any) => Promise.resolve(result()).then(resolve);
  return q;
};
(supabase as any).rpc = async (name: string) => ({ data: name === 'emargement_fenetres_eleve' ? params.has('error') ? null : slots.map(s => ({ date_cours: s.date, creneau:s.creneau, debut:s.creneau==='matin'?'09:00:00':'13:00:00', fin:s.creneau==='matin'?'12:00:00':'17:00:00', ouverte:true, pratique:false })) : null, error: params.has('error') && name === 'emargement_fenetres_eleve' ? {message:'refus fictif',code:'fixture'} : null });
(supabase as any).channel = () => { const channel:any={on:()=>channel,subscribe:()=>channel}; return channel; };
(supabase as any).removeChannel = async () => {};
const root = document.getElementById('root');
if (root) createRoot(root).render(<main className="max-w-5xl mx-auto p-4">{params.get('view') === 'documents' ? <RemboursementFCViewer apprenantId={id} completed onComplete={() => {}} /> : <EmargementsSignesViewer apprenantId={id} readOnly={admin} completed onComplete={() => {}} />}</main>);