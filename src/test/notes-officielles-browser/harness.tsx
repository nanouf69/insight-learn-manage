import React from 'react';
import {createRoot} from 'react-dom/client';
import {NotesExamensOfficiels} from '@/components/cours-en-ligne/NotesExamensOfficiels';
import '@/index.css';
const root=document.getElementById('root');if(root)createRoot(root).render(<main className="max-w-4xl mx-auto p-4"><NotesExamensOfficiels titre="Examens blancs officiels" examens={Array.from({length:6},(_,i)=>({id:`EB${i+1}`,titre:`EB${i+1}`,note:i===0?16:i===3?13.2:null,date:i===0||i===3?'2026-11-12T12:00:00Z':null,statut:i===1?'Note en attente':i===0||i===3?'Réussi':'Non réalisé',matieres:[{id:'t3p',nom:'A. Réglementation T3P',coefficient:3,note:i===0?20:null,date:null,statut:'Non réalisé'},{id:'anglais',nom:'E. Anglais',coefficient:1,note:i===0?4:null,date:null,statut:'Non réalisé'}]}))}/></main>);