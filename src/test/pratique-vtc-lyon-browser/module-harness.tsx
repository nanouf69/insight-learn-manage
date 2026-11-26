// Real ModuleDetailView + persistence queue. Fictional SDK, Edge transport and server rows only.
import fixture from "./module-fixture.json";
import { ajouterLyonVtc } from "@/lib/pratiqueVtcLyonQcm2";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ModuleDetailView from "@/components/cours-en-ligne/ModuleDetailView";
import { supabase } from "@/integrations/supabase/client";
import { setAnswerSaveAuthToken, setAnswerSaveOwnership } from "@/lib/answerPersistence";
import { Toaster } from "sonner";
import "@/index.css";
const params = new URLSearchParams(location.search);
const id = 8;
const owner = "22222222-2222-4222-8222-222222222222";
const learner = "11111111-1111-4111-8111-111111111111";
const token = `fixture.${btoa(JSON.stringify({ sub: owner, exp: 4102444800 }))}.fixture`;
const proposed = ajouterLyonVtc(fixture);
const exercises = proposed.exercices;
const courses = proposed.cours;
const moduleData = proposed;
const key = `fixture-subject-server-${id}`;
const initial = exercises.map(e => ({ apprenant_id: learner, exercice_id: `module_${id}_exo_${e.id}`, exercice_type: "quiz", status: "in_progress", tentative: 1, write_seq: 1, reponses: {}, total_questions: e.questions.length }));
if (params.has("missing")) {
  const row = initial.find(r => r.exercice_id === `module_${id}_exo_62`);
  if (row) delete row.reponses["62-8"];
}
if (params.has("missingDuplicate")) {
  const row = initial.find(r => r.exercice_id === `module_${id}_exo_62`);
  if (row) {
    row.reponses["62-31"] = "B";
    delete row.reponses["62-50"];
  }
}
let rows: any[] = JSON.parse(sessionStorage.getItem(key) ?? JSON.stringify(initial));
const calls: any[] = [];
Object.assign(window, { fixtureCalls: calls, fixtureRows: () => rows });
const save = () => sessionStorage.setItem(key, JSON.stringify(rows));
let pagesCompleted: number[] = [];
(supabase.auth as any).getSession = async () => ({ data: { session: { user: { id: owner }, access_token: token, refresh_token: "fictional-only", expires_at: 4102444800 } }, error: null });
(supabase.auth as any).getUser = async () => ({ data: { user: { id: owner } }, error: null });
(supabase as any).rpc = async (name: string, args: any) => {
  calls.push({ name, args });
  if (name === "save_module_pages_progress") { pagesCompleted = args._pages; return { data: null, error: null }; }
  if (name === "submit_quiz_attempt") {
    if (params.get("fail") === "submit") return { data: null, error: { code: "42501" } };
    const row = rows.find(r => r.exercice_id === args._exercice_id);
    if (!row || Object.keys(args._reponses).length !== row.total_questions) return { data: null, error: { code: "P0501" } };
    Object.assign(row, { status: "submitted", submitted_at: "2026-11-20T09:19:00Z", reponses: args._reponses, bonnes_reponses: args._bonnes_reponses, score: args._score });
    save(); return { data: row, error: null };
  }
  return { data: [], error: null };
};
(supabase as any).from = (table: string) => {
  const filters: Record<string, any> = {};
  const getRows = () => table === "module_editor_state" ? [{ module_id: id, module_data: {...moduleData, cours: courses}, deleted_cours: [], deleted_exercices: [] }] : table === "reponses_apprenants" ? rows.filter(row => !filters.exercice_id || row.exercice_id === filters.exercice_id) : table === "apprenant_module_completion" ? [{ pages_completees: pagesCompleted, completed: false }] : [];
  const q: any = new Proxy({}, { get: (_, method) => method === "then" ? (resolve: any) => resolve({ data: getRows(), error: null }) : method === "single" || method === "maybeSingle" ? async () => ({ data: getRows()[0] ?? null, error: null }) : (...args: any[]) => { if (method === "eq") filters[args[0]] = args[1]; return q; } });
  return q;
};
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = String(input);
  if (url.includes("upsert-reponse-apprenant")) {
    const body = JSON.parse(String(init?.body ?? "{}")); calls.push({ name: "answer-save", args: body });
    const row = rows.find(r => r.exercice_id === body.exercice_id);
    if (params.get("fail") === "save") return new Response(JSON.stringify({ error: "refus fictif" }), { status: 403 });
    if (row) { row.reponses = { ...row.reponses, ...body.reponses }; row.write_seq++; save(); }
    return new Response(JSON.stringify({ success: true, confirmed: true, write_seq: row?.write_seq ?? 1, stored_reponses: row?.reponses, accepted_event_ids: (body.events ?? []).map((e: any) => e.event_id) }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (!url.startsWith("/") && !url.startsWith(location.origin)) return new Response("{}", { status: 403 });
  return originalFetch(input, init);
};
setAnswerSaveAuthToken(token, owner);
setAnswerSaveOwnership({ apprenantId: learner, previewReadOnly: false });
const root = document.getElementById("root");
if (root) createRoot(root).render(<QueryClientProvider client={new QueryClient()}><ModuleDetailView module={moduleData as any} studentOnly apprenantId={learner} onBack={() => {}} /><Toaster /></QueryClientProvider>);