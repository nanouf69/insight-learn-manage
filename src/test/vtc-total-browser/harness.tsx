// Test-only entry: fixtures are intercepted; real mode reads only the scoped attendance loader.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PresenceFormationVtc } from '@/components/cours-en-ligne/PresenceFormationVtc';
import { chargerTauxPresenceHeures, useTauxPresenceHeures, calculerTauxPresenceHeures } from '@/components/crm/TauxPresenceSessionsCard';
import { tauxTotalPresence } from '@/lib/tauxTotalPresence';
import '@/index.css';
const params=new URLSearchParams(location.search);
const id=params.get('id') ?? '11111111-1111-4111-8111-000000000001';
Object.assign(window,{__presenceAudit:{chargerTauxPresenceHeures,calculerTauxPresenceHeures,tauxTotalPresence}});
function Summary(){
 const {data,erreur}=useTauxPresenceHeures(id,true,'vtc');const total=tauxTotalPresence(data);
 return <section aria-label="TOTAL administrateur" className="border-y py-4"><h2>TOTAL administrateur</h2>{total?<p>{total.faites.toLocaleString('fr-FR',{maximumFractionDigits:1})} h / {total.prevues} h — <strong>{total.pct.toLocaleString('fr-FR',{maximumFractionDigits:1})} %</strong></p>:<p>{erreur?'Indisponible':'Chargement…'}</p>}</section>;
}
const root=document.getElementById('root');if(root)createRoot(root).render(<main className="max-w-4xl mx-auto p-4"><Summary/><PresenceFormationVtc apprenantId={id} typeApprenant="vtc"/></main>);