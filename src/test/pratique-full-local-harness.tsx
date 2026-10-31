import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import ModuleDetailView from '@/components/cours-en-ligne/ModuleDetailView';
import { useConnexionEleveConfirmee } from '@/hooks/useConnexionEleveConfirmee';
import '@/index.css';
function Harness() {
  const params = new URLSearchParams(location.search);
  const type = params.get('track') ?? 'vtc';
  const moduleId = ['taxi','ta'].includes(type) ? 6 : type === 'cas' ? 12 : 8;
  const connection = useConnexionEleveConfirmee({ embedded: false, userId: 'local-test-owner', authLoading: false });
  return <QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>
    <output aria-label="État connexion TEST">{connection}</output>
    <ModuleDetailView module={{id:moduleId,nom:`TEST PRATIQUE ${type}`}} studentOnly apprenantId="local-test-learner" apprenantType={type} onBack={() => {}} apprenantInfo={{nom:'TEST LOCAL',prenom:type}} />
    <Toaster />
  </QueryClientProvider>;
}
const root=document.getElementById('root');if(root)createRoot(root).render(<Harness />);