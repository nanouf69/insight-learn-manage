import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { pratiqueQuestionsSupport } from '@/lib/pratiqueQuestionsSupport';
import StableReadingImage from './StableReadingImage';

/** Authenticated image-only reading; no PDF URL, progress callback or persistence. */
export default function PratiqueQuestionsSupport({ moduleId, coursId }: { moduleId: number; coursId: number }) {
  const support = pratiqueQuestionsSupport(moduleId, coursId);
  const [ouvert, setOuvert] = useState(false);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [src, setSrc] = useState<string | null>(null);
  const [erreur, setErreur] = useState(false);
  const [retry, setRetry] = useState(0);
  const path = support?.pages[page];
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setSrc(null);
    setErreur(false);
    if (!ouvert || !path) return;
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { cancelled = true; setSrc(null); setOuvert(false); }
    });
    void (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const owner = session.session?.user.id;
        if (!owner) throw new Error('Session requise');
        const { data, error } = await supabase.storage.from('cours-fichiers').download(path);
        const { data: current } = await supabase.auth.getSession();
        if (error || !data || current.session?.user.id !== owner) throw new Error('Lecture refusée');
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setSrc(objectUrl);
      } catch { if (!cancelled) setErreur(true); }
    })();
    return () => { cancelled = true; listener.subscription.unsubscribe(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [ouvert, path, retry]);
  if (!support) return null;
  const changerPage = (next: number) => { setPage(next); setZoom(1); setSrc(null); };
  return (
    <section aria-label={support.titre} className="space-y-3 rounded-xl border-2 border-primary bg-primary/5 p-4 shadow-md print:hidden">
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
        </span>
        <p className="text-sm font-bold uppercase tracking-wide text-primary">À consulter avant l’examen pratique</p>
      </div>
      <Button size="lg" className="h-auto w-full whitespace-normal gap-3 py-4 text-left text-base font-bold" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}>
        <FileText className="h-6 w-6 shrink-0" />{support.titre} — {ouvert ? 'Fermer' : 'Ouvrir le document'}
      </Button>
      {ouvert && <div className="space-y-3 select-none" onContextMenu={e => e.preventDefault()}>
        <div className="flex flex-wrap justify-center items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Page précédente des questions pratiques" disabled={page === 0} onClick={() => changerPage(page - 1)}><ChevronLeft /></Button>
          <span role="status" className="text-sm tabular-nums">Page {page + 1} / {support.pages.length}</span>
          <Button variant="outline" size="icon" aria-label="Page suivante des questions pratiques" disabled={page === support.pages.length - 1} onClick={() => changerPage(page + 1)}><ChevronRight /></Button>
          <Button variant="ghost" size="icon" aria-label="Dézoomer les questions pratiques" disabled={zoom <= 1} onClick={() => setZoom(Math.max(1, zoom - .5))}><ZoomOut /></Button>
          <Button variant="ghost" size="icon" aria-label="Zoomer les questions pratiques" disabled={zoom >= 3} onClick={() => setZoom(Math.min(3, zoom + .5))}><ZoomIn /></Button>
        </div>
        {erreur ? <div className="text-center space-y-2"><p role="alert">Cette page n’a pas pu être chargée. Vérifiez votre connexion.</p><Button variant="outline" onClick={() => setRetry(retry + 1)}>Réessayer</Button></div>
          : src ? <StableReadingImage src={src} alt={`${support.titre} — Page ${page + 1}`} zoom={zoom} onError={() => setErreur(true)} />
          : <p role="status" className="text-muted-foreground text-center">Chargement…</p>}
      </div>}
    </section>
  );
}