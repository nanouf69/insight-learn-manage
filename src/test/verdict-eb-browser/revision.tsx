// Test-only entry. The browser intercepts every backend call with disposable PostgreSQL.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { RevisionCorrigeVersionnee } from '@/components/cours-en-ligne/RevisionCorrigeVersionnee';
import '@/index.css';
const root=document.getElementById('root');
const refs=[{type:'attempt' as const,id:'44444444-4444-4444-8444-000000000004',question:'francais:4'}];
if(root)createRoot(root).render(<main className="mx-auto max-w-3xl p-4"><RevisionCorrigeVersionnee owner="11111111-1111-4111-8111-000000000001" refs={refs} onExit={()=>{}}/></main>);