import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CapacitePratiqueSelect } from '@/components/examens/CapacitePratiqueSelect';
import { appliquerCapacitePratique, capacitePratique, joursFormationPratique } from '@/lib/planningCapacitePratique';
import '@/index.css';

function Harness() {
  const [maximum, setMaximum] = useState(3);
  const [parDate, setParDate] = useState({ '2026-11-24': 3, '2026-11-25': 3 });
  const change = (value: 3 | 4) => { setMaximum(value); setParDate(previous => appliquerCapacitePratique(value, previous) as typeof previous); };
  return <main className="p-6 space-y-6 bg-background text-foreground">
    <section className="space-y-3">
      <h1>Candidats à former — contrôle fictif</h1>
      <CapacitePratiqueSelect id="candidats" value={maximum} onChange={change} />
      <p data-testid="vtc">56 VTC : {joursFormationPratique(56, maximum)} jours</p>
      <p data-testid="taxi">12 TAXI : {joursFormationPratique(12, maximum)} jours</p>
    </section>
    <section className="space-y-3">
      <h2>Planning formation pratique</h2>
      <CapacitePratiqueSelect id="planning" value={maximum} onChange={change} />
      {Object.keys(parDate).map(date => <p key={date} data-testid={date}>{date} : {capacitePratique(maximum, date, parDate)} candidats maximum</p>)}
    </section>
  </main>;
}
const root = document.getElementById('root');
if (root) createRoot(root).render(<Harness />);