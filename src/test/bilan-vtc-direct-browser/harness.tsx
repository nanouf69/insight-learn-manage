// Test-only: no real session; all data and RPCs are replaced before mounting.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModuleDetailView from '@/components/cours-en-ligne/ModuleDetailView';
import { supabase } from '@/integrations/supabase/client';
import { setLearnerPreviewReadOnly } from '@/lib/learnerPreviewGuard';
import '@/index.css';
const admin = new URLSearchParams(location.search).get('admin') === '1';
const legacy = new URLSearchParams(location.search).get('legacy') === '1';
const profile = new URLSearchParams(location.search).get('profile') === '1';
const scores = [[93,114],[128,200],[206,249]];
const calls: { name: string; args: unknown }[] = [];
Object.assign(window, { fixtureCalls: calls });
const questions = (id: number) => [{ id: 1, question: `Question fictive ${id}`, enonce: `Question fictive ${id}`, choix: [{ lettre: 'A', texte: 'Réponse A', correct: false }, { lettre: 'B', texte: 'Réponse B', correct: true }] }];
const moduleData = { id: 5, nom: 'Bilan examen VTC', description: '', cours: [{ id: 1794399472264, titre: 'Questions QRC VTC', actif: true, description: 'https://quick-qna-engine.lovable.app', sousTitre: 'https://quick-qna-engine.lovable.app' }], exercices: [500,501,502,503,504,505,506,507].map(id => ({ id, titre: id === 505 ? 'F(V) — Développement commercial' : id === 506 ? 'G(V) — Réglementation spécifique' : id === 507 ? 'H — Complément' : `Matière ${id}`, actif: true, questions: questions(id) })) };
const ap = { route: legacy ? 'legacy' : 'future', matieres: [500,501,502,503,504].map((exercise_id,i) => ({ exercise_id, questions: questions(exercise_id), submitted: profile && i<3 ? {correct_count:scores[i][0],question_count:scores[i][1]} : null })) };
(supabase.auth as any).getSession = async () => ({ data: { session: { user: { id: 'fixture-owner' }, access_token: 'fixture-only', refresh_token: 'fixture-only', expires_at: 4102444800 } }, error: null });
(supabase.auth as any).getUser = async () => ({ data: { user: { id: 'fixture-owner' } }, error: null });
(supabase as any).rpc = async (name: string, args: any) => {
  calls.push({ name, args });
  if (name === 'bilan_future_route') return { data: legacy ? 'legacy' : 'future', error: null };
  if (name === 'bilan_future_admin_apercu') return { data: ap, error: null };
  if (name === 'bilan_future_open') return { data: { id: 'fixture-receipt', version_id: 'fixture-version' }, error: null };
  if (name === 'bilan_future_questions') return { data: { version_id: 'fixture-version', questions: questions(500) }, error: null };
  if (name === 'bilan_future_resume') return { data: { version_id: 'fixture-version', answers: {}, submitted: false }, error: null };
  return { data: [], error: null };
};
(supabase as any).from = (table: string) => {
  calls.push({name:`read:${table}`,args:null});
  const rows = table === 'module_editor_state' ? [{ module_id: 5, module_data: moduleData, deleted_cours: [], deleted_exercices: [] }] : table === 'bilan_future_receipts' && profile ? ap.matieres.filter(m=>m.exercise_id<504).map(m=>({exercise_id:m.exercise_id,bilan_future_submissions:m.submitted?[m.submitted]:[]})) : table === 'reponses_apprenants' ? [...[505,506].map(id => ({ exercice_id: `module_5_exo_${id}`, reponses: { [`${id}-1`]: ['B'] }, status: profile?'submitted':'draft', submitted_at:profile?'2026-11-01':null,bonnes_reponses:id===505?29:30,total_questions:id===505?49:46,write_seq: 1 })),...(profile?[{exercice_id:'module_5_revision_exo_505',status:'in_progress',reponses:{'505-1':['A']},bonnes_reponses:0,total_questions:49}]:[])] : [];
  const q: any = new Proxy({}, { get: (_, key) => key === 'then' ? (resolve: any) => resolve({ data: rows, error: null }) : key === 'maybeSingle' || key === 'single' ? async () => ({ data: rows[0] ?? null, error: null }) : (..._args: any[]) => q });
  return q;
};
setLearnerPreviewReadOnly(admin);
const root = document.getElementById('root');
if (root) createRoot(root).render(<QueryClientProvider client={new QueryClient()}><ModuleDetailView module={moduleData as any} studentOnly apercuAdmin={admin} apprenantId="fixture-owner" onBack={() => {}} /></QueryClientProvider>);