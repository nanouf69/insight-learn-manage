import React from 'react';
import { createRoot } from 'react-dom/client';
import { FirstPassageProvider, QuestionFirstPassageRate } from '@/components/cours-en-ligne/QuestionFirstPassageRate';
import { Button } from '@/components/ui/button';
import '@/index.css';
const root=document.getElementById('root');
if(root)createRoot(root).render(<main className="mx-auto max-w-3xl space-y-4 p-4 bg-background text-foreground overflow-auto h-screen" id="fullscreen"><Button onClick={()=>document.getElementById('fullscreen')?.requestFullscreen()}>Plein écran</Button><FirstPassageProvider moduleId={35} exerciseId={0} questions={[{id:8,type:'QCM',enonce:'Question fictive',choix:[{lettre:'A',texte:'Oui',correct:true}]}]} enabled examId="EB1" subjectId="gestion"><QuestionFirstPassageRate questionId={8} presentation="panel" /></FirstPassageProvider></main>);
