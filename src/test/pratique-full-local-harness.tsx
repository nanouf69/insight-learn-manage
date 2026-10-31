import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import ModuleDetailView from '@/components/cours-en-ligne/ModuleDetailView';
import { useConnexionEleveConfirmee } from '@/hooks/useConnexionEleveConfirmee';
import { installAnswerPersistence, setAnswerSaveAuthToken, setAnswerSaveOwnership } from '@/lib/answerPersistence';
import SlideViewer from '@/components/cours-en-ligne/slides/SlideViewer';
import ImageCarouselViewer from '@/components/cours-en-ligne/ImageCarouselViewer';
import { ImageLightbox } from '@/components/cours-en-ligne/ImageLightbox';
import '@/index.css';
setAnswerSaveOwnership({apprenantId:'local-test-learner'});
setAnswerSaveAuthToken('local-test-token','local-test-owner');
installAnswerPersistence();
function Harness() {
  const params = new URLSearchParams(location.search);
  const type = params.get('track') ?? 'vtc';
  if (params.get('readers')) return <div className="max-w-5xl mx-auto">
    <SlideViewer titre="TEST" onBack={()=>{}} slides={[{type:'title',title:'FIRST'},{type:'title',title:'SECOND'}]} />
    <ImageCarouselViewer nom="TEST" images={['/local-image-a.png','/local-image-b.png']} />
    <ImageLightbox src="/local-delayed.png" alt="TEST DELAYED" reserveFrame />
    <textarea aria-label="TEST QRC" />
  </div>;
  const moduleId = ['taxi','ta'].includes(type) ? 6 : type === 'cas' ? 12 : 8;
  const connection = useConnexionEleveConfirmee({ embedded: false, userId: 'local-test-owner', authLoading: false });
  return <QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>
    <output aria-label="État connexion TEST">{connection}</output>
    <ModuleDetailView module={{id:moduleId,nom:`TEST PRATIQUE ${type}`}} studentOnly apprenantId="local-test-learner" apprenantType={type} onBack={() => {}} apprenantInfo={{nom:'TEST LOCAL',prenom:type}} />
    <Toaster />
  </QueryClientProvider>;
}
const root=document.getElementById('root');if(root)createRoot(root).render(<Harness />);