import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PdfSlideViewer from '@/components/cours-en-ligne/PdfSlideViewer';
import PratiqueTaxiLyonSupport from '@/components/cours-en-ligne/PratiqueTaxiLyonSupport';
import PratiqueVtcLyonSupport from '@/components/cours-en-ligne/PratiqueVtcLyonSupport';
import ImageCarouselViewer from '@/components/cours-en-ligne/ImageCarouselViewer';
import { useConnexionEleveConfirmee } from '@/hooks/useConnexionEleveConfirmee';
import '@/index.css';
function Harness() {
  const track = new URLSearchParams(location.search).get('track') ?? 'VTC';
  const [revision, setRevision] = useState(0);
  const connection = useConnexionEleveConfirmee({ embedded: false, userId: 'test-owner', authLoading: false });
  return <main><h1>TEST {track}</h1><output>{connection}</output><button onClick={() => setRevision(revision + 1)}>Refetch TEST</button><span>{revision}</span>
    <PdfSlideViewer url='/iphone-fixture.pdf' nom={track} />
    <ImageCarouselViewer images={['/test-image.png','/test-image.png']} nom='TEST carousel' />
    {track === 'TAXI' || track === 'TA' ? <PratiqueTaxiLyonSupport moduleId={6} /> : <PratiqueVtcLyonSupport moduleId={8} />}
    <div style={{height:900}} /><textarea aria-label='Brouillon TEST' defaultValue='' />
  </main>;
}
const root=document.getElementById('root'); if(root)createRoot(root).render(<Harness />);