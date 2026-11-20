// Real learner renderer and queue, fictional account/transport only; no remote mutation.
import fixture from './audited-bilan-fixture.json';
import { VTC_COURS_DATA } from '@/components/cours-en-ligne/vtc-cours-data';
import { TAXI_COURS_DATA } from '@/components/cours-en-ligne/taxi-cours-data';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModuleDetailView from '@/components/cours-en-ligne/ModuleDetailView';
import { supabase } from '@/integrations/supabase/client';
import { setAnswerSaveAuthToken, setAnswerSaveOwnership } from '@/lib/answerPersistence';
import { Toaster } from 'sonner';
import '@/index.css';
const params = new URLSearchParams(location.search);
const id = Number(params.get('module') ?? 4);
const exerciseId = Number(params.get('exercise') ?? 100);
const missingId = exerciseId === 100 ? 2077 : 62050;
const owner = '22222222-2222-4222-8222-222222222222';
const learner = '11111111-1111-4111-8111-111111111111';
const token = `fixture.${btoa(JSON.stringify({ sub: owner, exp: 4102444800 }))}.fixture`;
const exercises = fixture.exercises.filter(e => e.id === exerciseId);
const moduleData = { id, nom: 'Bilan exercices', description: '', cours: [], exercices: exercises };
const courseSource = id === 4 ? VTC_COURS_DATA : TAXI_COURS_DATA;
const sourceIds = [...new Set(fixture.exercises.flatMap(e => e.questions.map(q => q.source_exercice_id)))];
const sourceExercises = courseSource.exercices.map(e => sourceIds.includes(e.id) ? {
  ...e, questions: fixture.exercises.flatMap(ex => ex.questions).filter(q => q.source_exercice_id === e.id).map(q => ({ ...q, id: q.source_question_id })),
} : e);
const key = `fixture-bilan-duplicate-${id}-${exerciseId}`;
const initial = exercises.map(e => ({ apprenant_id: learner, exercice_id: `module_${id}_exo_${e.id}`, exercice_type: 'quiz', status: 'in_progress', tentative: 1, write_seq: 1,
  reponses: Object.fromEntries(e.questions.filter(q => q.id !== missingId).map(q => [`${e.id}-${q.id}`, q.choix?.filter(c => c.correct).map(c => c.lettre)])), total_questions: e.questions.length }));
let rows: any[] = JSON.parse(sessionStorage.getItem(key) ?? JSON.stringify(initial));
const calls: any[] = [];
Object.assign(window, { fixtureCalls: calls, fixtureRows: () => rows });
const save = () => sessionStorage.setItem(key, JSON.stringify(rows));
(supabase.auth as any).getSession = async () => ({ data: { session: { user: { id: owner }, access_token: token, refresh_token: 'fictional-only', expires_at: 4102444800 } }, error: null });
(supabase.auth as any).getUser = async () => ({ data: { user: { id: owner } }, error: null });
(supabase as any).rpc = async (name: string, args: any) => {
  calls.push({ name, args });
  if (name === 'submit_quiz_attempt') {
    const row = rows.find(r => r.exercice_id === args._exercice_id);
    if (!row || Object.keys(args._reponses).length !== row.total_questions) return { data: null, error: { code: 'P0501' } };
    Object.assign(row, { status: 'submitted', submitted_at: '2026-11-20T13:34:00Z', reponses: args._reponses, bonnes_reponses: args._bonnes_reponses, score: args._score });
    save(); return { data: row, error: null };
  }
  return { data: [], error: null };
};
(supabase as any).from = (table: string) => {
  const filters: Record<string, any> = {};
  const getRows = () => table === 'module_editor_state' ? [{ module_id: filters.module_id ?? id, module_data: Number(filters.module_id) === (id === 4 ? 2 : 10) ? { ...courseSource, exercices: sourceExercises } : moduleData, deleted_cours: [], deleted_exercices: [] }] : table === 'reponses_apprenants' ? rows.filter(row => !filters.exercice_id || row.exercice_id === filters.exercice_id) : [];
  const q: any = new Proxy({}, { get: (_, method) => method === 'then' ? (resolve: any) => resolve({ data: getRows(), error: null }) : method === 'single' || method === 'maybeSingle' ? async () => ({ data: getRows()[0] ?? null, error: null }) : (...args: any[]) => { if (method === 'eq') filters[args[0]] = args[1]; return q; } });
  return q;
};
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = String(input);
  if (url.includes('upsert-reponse-apprenant')) {
    const body = JSON.parse(String(init?.body ?? '{}')); calls.push({ name: 'answer-save', args: body });
    const row = rows.find(r => r.exercice_id === body.exercice_id);
    if (row) { row.reponses = { ...row.reponses, ...body.reponses }; row.write_seq++; save(); }
    return new Response(JSON.stringify({ success: true, confirmed: true, write_seq: row?.write_seq ?? 1, stored_reponses: row?.reponses, accepted_event_ids: (body.events ?? []).map((e: any) => e.event_id) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (!url.startsWith('/') && !url.startsWith(location.origin)) return new Response('{}', { status: 403 });
  return originalFetch(input, init);
};
setAnswerSaveAuthToken(token, owner);
setAnswerSaveOwnership({ apprenantId: learner, previewReadOnly: false });
const root = document.getElementById('root');
if (root) createRoot(root).render(<QueryClientProvider client={new QueryClient()}><ModuleDetailView module={moduleData as any} studentOnly apprenantId={learner} onBack={() => {}} /><Toaster /></QueryClientProvider>);