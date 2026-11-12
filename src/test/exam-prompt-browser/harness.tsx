import React from "react";
import { createRoot } from "react-dom/client";
import ExamensBlancsEditor, { loadSavedExamens } from "@/components/cours-en-ligne/ExamensBlancsEditor";
import { supabase } from "@/integrations/supabase/client";
import { resolveMatiereForScoring } from "@/components/cours-en-ligne/examens-blancs-scoring";
import "@/index.css";

// Test-only transport: every SDK call is replaced before mounting the real editor.
const fixture = { id: "reglementation_vtc1", nom: "F(V) — Développement commercial", duree: 30, coefficient: 1, noteSur: 20, noteEliminatoire: 6, questions: [
  { id: 41, type: "QCM", enonce: "Question QCM simulée", choix: [{ lettre: "A", texte: "Proposition A", correct: true }, { lettre: "B", texte: "Proposition B" }] },
  { id: 42, type: "QCM", enonce: "Question distincte", choix: [{ lettre: "A", texte: "Distincte", correct: true }] },
  { id: 43, type: "QRC", enonce: "Question QRC distincte", reponseQRC: "Distincte" },
  { id: 44, type: "QRC", enonce: "Qu'est-ce qu'un coût de revient ? (QRC)", reponseQRC: "Réponse simulée", reponses_possibles: ["coût"] },
] };
const original = structuredClone(fixture);
const initial = [90000, 90013, 90001].map((module_id) => ({ module_id, module_data: { id: module_id === 90000 ? "EB1" : module_id === 90013 ? "eb1-va" : "EB2", matieres: [structuredClone(fixture)] }, updated_at: "2026-11-12T12:00:00Z" }));
let rows = JSON.parse(sessionStorage.getItem("exam-prompt-fixtures") ?? "null") ?? initial;
const calls: string[] = [];
let fail = false;
let clock = Date.now();
const session = { user: { id: "simulated-only" }, access_token: "fictif", refresh_token: "fictif", expires_at: Math.floor(Date.now() / 1000) + 3600 };
(supabase.auth as any).getSession = async () => ({ data: { session }, error: null });
(supabase.auth as any).getUser = async () => ({ data: { user: session.user }, error: null });
(supabase.auth as any).refreshSession = async () => ({ data: { session }, error: null });
(supabase as any).from = (table: string) => {
  let moduleId: number | undefined;
  const value = () => ({ data: table === "module_editor_state" ? rows.filter((r: any) => moduleId === undefined || moduleId === r.module_id) : [], error: null });
  const chain: any = {
    select: () => chain, order: () => chain, in: () => chain, like: () => chain, limit: () => chain,
    eq: (key: string, id: number) => { if (key === "module_id") moduleId = id; return chain; },
    maybeSingle: async () => ({ data: value().data[0] ?? null, error: null }),
    insert: async () => { calls.push(`fixture-log:${table}`); return { data: null, error: null }; },
    then: (resolve: any) => Promise.resolve(value()).then(resolve),
  };
  return chain;
};
(supabase as any).rpc = async (name: string, args: any) => {
  calls.push(name);
  if (name !== "save_module_editor_state") return { data: [], error: null };
  const current = rows.find((r: any) => r.module_id === args.p_module_id);
  if (fail || !current || current.updated_at !== args.p_expected_updated_at) return { data: null, error: { code: "P0409", message: "stale_module_editor_state_write" } };
  current.module_data = structuredClone(args.p_module_data);
  current.updated_at = new Date(++clock).toISOString();
  sessionStorage.setItem("exam-prompt-fixtures", JSON.stringify(rows));
  return { data: [{ updated_at: current.updated_at }], error: null };
};
(window as any).promptTest = {
  calls, fail: (v: boolean) => { fail = v; }, rows: () => structuredClone(rows),
  readActive: () => loadSavedExamens(false, undefined, true),
  frozen: () => resolveMatiereForScoring(rows[0].module_data.matieres[0], { snapshot: { ...original, version: 1, matiereId: original.id, questions: original.questions.map((q, ordre) => ({ ...q, ordre, points: 1 })) } }),
};
const root = document.getElementById("root");
if (root) createRoot(root).render(<main className="p-4"><ExamensBlancsEditor defaultExamenId={new URLSearchParams(location.search).get("exam") ?? "EB1"} onBack={() => {}} /></main>);