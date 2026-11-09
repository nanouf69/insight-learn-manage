// Test-only entry, never referenced by application routes. Renders the real
// learner exam card list; the network is fully stubbed by Playwright (read-only fixtures).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { EcranSelection } from '@/components/cours-en-ligne/ExamenBlancsListe';
import { tousLesExamens } from '@/components/cours-en-ligne/examens-blancs-data';
import '@/index.css';
const params = new URLSearchParams(location.search);
const apprenantId = params.get('apprenant');
const type = params.get('type') || 'TAXI';
const root = document.getElementById('root');
if (root) createRoot(root).render(
  <div className="p-4">
    <EcranSelection
      onStart={() => {}}
      onEdit={() => {}}
      onViewResults={() => {}}
      apprenantType={type}
      examensData={tousLesExamens}
      apprenantId={apprenantId}
      isAdmin={false}
    />
  </div>,
);
