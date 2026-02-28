import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfSlideViewerProps {
  url: string;
  nom: string;
}

export default function PdfSlideViewer({ url, nom }: PdfSlideViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(960);

  // Recalculate width on resize / fullscreen changes
  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth - 32);
    }
  }, []);

  useEffect(() => {
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateWidth]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    updateWidth();
  }, [updateWidth]);

  const prev = () => setPage((p) => Math.max(1, p - 1));
  const next = () => setPage((p) => Math.min(numPages, p + 1));
  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const resetZoom = () => setZoom(1);
  const fullscreen = () => containerRef.current?.requestFullscreen?.();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  };

  return (
    <div
      ref={containerRef}
      className="border rounded-lg overflow-hidden bg-muted/30 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-muted/50 border-b flex-wrap">
        <Button variant="ghost" size="sm" onClick={prev} disabled={page <= 1}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs font-medium text-muted-foreground min-w-[4rem] text-center">
          {page} / {numPages || "…"}
        </span>
        <Button variant="ghost" size="sm" onClick={next} disabled={page >= numPages}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button variant="ghost" size="sm" onClick={zoomOut}><ZoomOut className="w-4 h-4" /></Button>
        <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="sm" onClick={zoomIn}><ZoomIn className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={resetZoom}><RotateCcw className="w-4 h-4" /></Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={fullscreen}><Maximize className="w-4 h-4" /></Button>
      </div>

      {/* PDF Page — scrollable when zoomed */}
      <div className="flex justify-center overflow-auto" style={{ maxHeight: "72vh" }}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="flex items-center justify-center p-12 text-muted-foreground">Chargement du PDF…</div>}
          error={<div className="flex items-center justify-center p-12 text-destructive">Impossible de charger le PDF.</div>}
        >
          <Page
            pageNumber={page}
            width={containerWidth * zoom}
            renderTextLayer
            renderAnnotationLayer
          />
        </Document>
      </div>

      {/* Bottom nav for mobile */}
      <div className="flex items-center justify-between p-2 border-t bg-muted/50 sm:hidden">
        <Button variant="outline" size="sm" onClick={prev} disabled={page <= 1}>← Précédent</Button>
        <span className="text-xs text-muted-foreground">{page}/{numPages}</span>
        <Button variant="outline" size="sm" onClick={next} disabled={page >= numPages}>Suivant →</Button>
      </div>
    </div>
  );
}