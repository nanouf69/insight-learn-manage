// Test-only real learner UI. All external calls MUST be intercepted before navigation.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { PassageMatiere } from '@/components/cours-en-ligne/ExamenBlancsPassage';
import { requestExamExit } from '@/components/cours-en-ligne/ExamExitGuard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { setAnswerSaveAuthToken, setAnswerSaveOwnership } from '@/lib/answerPersistence';
import '@/index.css';
const A = '11111111-1111-4111-8111-000000000001';
const U = '22222222-2222-4222-8222-000000000002';
const type = new URLSearchParams(location.search).get('type') ?? 'VTC';
const fakeSession = { user: { id: U }, access_token: 'fictif-ux-only', refresh_token: 'fictif-refresh', expires_at: 9999999999 };
Object.assign(supabase.auth, { getSession: async () => ({ data: { session: fakeSession }, error: null }), refreshSession: async () => ({ data: { session: fakeSession }, error: null }) });
setAnswerSaveAuthToken('fictif-ux-only', U);
setAnswerSaveOwnership({ apprenantId: A, previewReadOnly: false });
const matiere = { id: 'gestion', nom: `Gestion ${type} — copie fictive`, duree: 30, coefficient: 1, noteSur: 20, noteEliminatoire: 6,
  questions: [{ id: 1, type: 'QRC' as const, enonce: 'Indiquez le résultat de votre calcul.', reponseQRC: '42', points: 1 }, { id: 2, type: 'QRC' as const, enonce: 'Indiquez votre deuxième résultat.', reponseQRC: '24', points: 1 }] };
function Subject() {
  const nav = useNavigate(); const [away, setAway] = useState(false);
  if (away) return <><p>Liste des matières</p><Button onClick={() => setAway(false)}>Reprendre la matière</Button></>;
  return <main className="max-w-5xl mx-auto p-4 space-y-4">
    <nav className="flex flex-wrap gap-2">
      <Button onClick={() => requestExamExit(() => setAway(true))}>Retour à la liste</Button>
      <Button onClick={() => requestExamExit(() => setAway(true))}>Autre matière</Button>
      <Button onClick={() => nav('/ux-notes')}>Notes</Button>
      <Button onClick={() => nav(-1)}>Retour navigateur</Button>
    </nav>
    <PassageMatiere matiere={matiere} numero={1} total={2} apprenantId={A} userId={U} examenId={type === 'TAXI' ? 'EB1-TAXI' : 'EB1'} onTerminer={() => { throw new Error('Unexpected finalization in UX-only check'); }} />
  </main>;
}
function Notes() { const nav = useNavigate(); return <><p>Notes fictives</p><Button onClick={() => nav('/src/test/exam-ux-browser/harness.html'+location.search)}>Ouvrir la matière</Button></>; }
const root = document.getElementById('root');
if (root) createRoot(root).render(<BrowserRouter><Routes><Route path="/ux-notes" element={<Notes />} /><Route path="*" element={<Subject />} /></Routes></BrowserRouter>);