import { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { ensurePdfWorker } from '@/lib/pdfWorker';
ensurePdfWorker();

export function LocationPdfPreview({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [pages, setPages] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setWidth(Math.max(180, Math.floor(entry.contentRect.width))); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className="w-full flex-1 min-h-0 overflow-y-auto">
    <Document file={url} onLoadSuccess={({ numPages }) => setPages(numPages)} loading="Chargement du PDF…" error={<p role="alert" className="text-destructive">Lecture PDF impossible. Le téléchargement reste disponible.</p>}>
      {Array.from({length: pages},(_,i) => <div key={i} className="mb-4"><Page pageNumber={i+1} width={width} renderTextLayer={false} renderAnnotationLayer={false} /></div>)}
    </Document>
  </div>;
}