import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PdfSlideViewer from '@/components/cours-en-ligne/PdfSlideViewer';
import { useConnexionEleveConfirmee } from '@/hooks/useConnexionEleveConfirmee';
import { useAutoSave, loadSavedDraft } from '@/hooks/useAutoSave';
import '@/index.css';
function Harness() {
  const restored = loadSavedDraft('test-owner', 'iphone-fixture');
  const [answers, setAnswers] = useState({ qcm: restored?.qcm ?? false, qrc: restored?.qrc ?? '' });
  const state = useConnexionEleveConfirmee({ embedded: false, userId: 'test-owner', authLoading: false });
  const save = useAutoSave({ apprenantId: 'test-owner', typeDocument: 'iphone-fixture', titre: 'TEST iPhone', moduleId: 8 });
  return <main><h1>TEST iPhone — Pratique VTC 8</h1><output aria-label="Connexion">{state}</output>
    <PdfSlideViewer url="/iphone-fixture.pdf" nom="TEST diaporama" />
    <div style={{ height: 900 }} />
    <label><input type="checkbox" checked={answers.qcm} onChange={e => { const next = { ...answers, qcm: e.target.checked }; setAnswers(next); save.queueSave(next); }} />QCM TEST</label>
    <label>QRC TEST<textarea value={answers.qrc} onChange={e => { const next = { ...answers, qrc: e.target.value }; setAnswers(next); save.queueSave(next); }} /></label>
    <save.StatusIndicator />
  </main>;
}
const root = document.getElementById('root');
if (root) createRoot(root).render(<Harness />);