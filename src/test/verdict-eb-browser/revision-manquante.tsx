import React from 'react';
import { createRoot } from 'react-dom/client';
import { RevisionFausses } from '@/components/cours-en-ligne/ExamenBlancsResultats';
import '@/index.css';
const questions = [1,2].map(id => ({id, type:'QRC' as const, enonce:`Question fictive ${id}`, reponseQRC:'Texte', reponses_possibles:['texte']}));
const matiere = {id:'gestion',nom:'Gestion',questions};
const root = document.getElementById('root');
if(root) createRoot(root).render(<main className="mx-auto max-w-3xl p-4"><RevisionFausses wrongQuestions={questions.map(question=>({question,matiere,matiereNom:'Gestion'})) as any} apprenantId="11111111-1111-4111-8111-000000000001" userId="22222222-2222-4222-8222-000000000002" examenId="EB5" onTerminer={()=>{}}/></main>);