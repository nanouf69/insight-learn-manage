// Test-only: real CRM panel with an in-memory query fixture. All external
// network requests must be blocked by the browser contract. No real session.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExamensBlancsResetTab from '@/components/crm/apprenant-sections/ExamensBlancsResetTab';
import '@/index.css';
const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
const track = new URLSearchParams(location.search).get('track') === 'taxi' ? 'taxi' : 'vtc';
const quizId = track === 'taxi' ? 'EB3-TAXI' : 'EB3';
client.setQueryData(['examen-blanc-results-admin', 'fictif-only'], [{
  examenNum: 3, examenLabel: `Examen Blanc 3 — ${track.toUpperCase()}`, type: track, quizId,
  totalScore: 27, totalMax: 40, lastDate: '2026-11-01T12:00:00Z',
  results: [
    { result_id: 'fictif-gestion', quiz_id: quizId, matiere_id: 'gestion', matiere_nom: 'B Gestion', score_obtenu: 15, score_max: 20, completed_at: '2026-11-01T12:00:00Z' },
    { result_id: 'fictif-anglais', quiz_id: quizId, matiere_id: 'anglais', matiere_nom: 'E Anglais', score_obtenu: 12, score_max: 20, completed_at: '2026-11-01T12:00:00Z' },
  ],
}]);
const root = document.getElementById('root');
if (root) createRoot(root).render(<QueryClientProvider client={client}><div className="p-4">
  <ExamensBlancsResetTab apprenant={{ id: 'fictif-only', prenom: 'Élève', nom: 'FICTIF' }} />
</div></QueryClientProvider>);