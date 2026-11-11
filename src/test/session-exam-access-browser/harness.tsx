import {createRoot} from 'react-dom/client';
import {SessionExamAccess} from '@/components/sessions/acces-examens/SessionExamAccess';
import '@/index.css';
const root=document.getElementById('root');
if(root)createRoot(root).render(<main className="mx-auto max-w-3xl p-4"><SessionExamAccess sessionId="44444444-4444-4444-4444-444444444444" sessionName="VTC SOIR — SESSION FICTIVE NOVEMBRE"/></main>);