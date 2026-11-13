import React from 'react';
import {createRoot} from 'react-dom/client';
import {RevisionFausses} from '@/components/cours-en-ligne/ExamenBlancsResultats';
import '@/index.css';
const question={id:1,type:'QCM' as const,enonce:'Question fictive copie récente',choix:[{lettre:'A',texte:'Choix A',correct:true},{lettre:'B',texte:'Choix B',correct:false}]};
const matiere={id:'gestion',questions:[question]};
const root=document.getElementById('root');
if(root)createRoot(root).render(<main className="mx-auto max-w-3xl p-4"><RevisionFausses wrongQuestions={[{matiere,question,matiereNom:'Gestion',sourceResultId:'new-copy'}] as any} apprenantId="11111111-1111-4111-8111-000000000001" userId="22222222-2222-4222-8222-000000000002" examenId="EB6-TAXI" onTerminer={()=>{}}/></main>);