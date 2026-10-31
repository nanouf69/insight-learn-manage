import { useState } from "react";
import { ChevronLeft, ChevronRight, FileText, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supportPratiqueVtcLyon } from "@/lib/pratiqueVtcLyonSupport";
import StableReadingImage from './StableReadingImage';

/** Supplementary reading only: no completion callback or persisted activity. */
export default function PratiqueVtcLyonSupport({ moduleId }: { moduleId: number }) {
  const support = supportPratiqueVtcLyon(moduleId);
  const [ouvert, setOuvert] = useState(false);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [erreur, setErreur] = useState(false);
  const [retry, setRetry] = useState(0);
  if (!support) return null;
  const changerPage = (next: number) => { setPage(next); setZoom(1); setErreur(false); };

  return (
    <section aria-label={support.titre} className="space-y-3 border-t pt-4">
      <Button variant="outline" className="h-auto whitespace-normal text-left gap-2" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}>
        <FileText className="h-4 w-4 shrink-0" />{support.titre}
      </Button>
      {ouvert && (
        <div className="space-y-2 select-none" onContextMenu={(e) => e.preventDefault()}>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="icon" aria-label="Page précédente du support VTC" disabled={page === 0} onClick={() => changerPage(page - 1)}><ChevronLeft /></Button>
            <span className="text-sm tabular-nums" role="status">Page {page + 1} / {support.pages.length}</span>
            <Button variant="outline" size="icon" aria-label="Page suivante du support VTC" disabled={page === support.pages.length - 1} onClick={() => changerPage(page + 1)}><ChevronRight /></Button>
            <Button variant="ghost" size="icon" aria-label="Dézoomer le support VTC" disabled={zoom <= 1} onClick={() => setZoom(Math.max(1, zoom - 0.5))}><ZoomOut /></Button>
            <Button variant="ghost" size="icon" aria-label="Zoomer le support VTC" disabled={zoom >= 3} onClick={() => setZoom(Math.min(3, zoom + 0.5))}><ZoomIn /></Button>
          </div>
          {erreur ? (
            <div className="text-center space-y-2 p-6"><p role="alert">Cette page n’a pas pu être chargée.</p><Button variant="outline" onClick={() => { setErreur(false); setRetry(retry + 1); }}>Réessayer</Button></div>
          ) : (
            <StableReadingImage key={`${page}-${retry}`} src={support.pages[page]} alt={`${support.titre} — Page ${page + 1}`} zoom={zoom} onError={() => setErreur(true)} />
          )}
        </div>
      )}
    </section>
  );
}