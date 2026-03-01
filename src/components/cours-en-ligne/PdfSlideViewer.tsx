import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize } from "lucide-react";
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
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(960);

  const isExpanded = isNativeFullscreen || isPseudoFullscreen;

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

  // Listen for native fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Lock page scroll in pseudo fullscreen mode
  useEffect(() => {
    if (!isPseudoFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPseudoFullscreen]);

  // Block right-click, print, save shortcuts
  useEffect(() => {
    const blockContextMenu = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    const blockKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "p" || e.key.toLowerCase() === "s")) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockKeys);
    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockKeys);
    };
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    updateWidth();
  }, [updateWidth]);

  const prev = () => setPage((p) => Math.max(1, p - 1));
  const next = () => setPage((p) => Math.min(numPages, p + 1));
  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const resetZoom = () => setZoom(1);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (isPseudoFullscreen) {
      setIsPseudoFullscreen(false);
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    try {
      if (containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      } else {
        setIsPseudoFullscreen(true);
      }
    } catch {
      // Fallback when native fullscreen is blocked in iframe/browser
      setIsPseudoFullscreen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
    if (e.key === "Escape" && isPseudoFullscreen) setIsPseudoFullscreen(false);
    if (e.key === "Escape" && isNativeFullscreen) document.exitFullscreen();
  };

  return (
    <div
      ref={containerRef}
      className={`border overflow-hidden focus:outline-none ${
        isPseudoFullscreen
          ? "fixed inset-0 z-50 rounded-none bg-black flex flex-col"
          : isExpanded
            ? "rounded-lg bg-black flex flex-col"
            : "rounded-lg bg-muted/30"
      }`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
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
        <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
          {isExpanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </Button>
      </div>

      {/* PDF Page — scrollable when zoomed, touch-action for mobile */}
      <div
        className={`flex justify-center overflow-auto ${isExpanded ? "flex-1" : ""}`}
        style={{ maxHeight: isExpanded ? "calc(100vh - 100px)" : "80vh", touchAction: "pan-x pan-y" }}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="flex items-center justify-center p-12 text-muted-foreground">Chargement du PDF…</div>}
          error={<div className="flex items-center justify-center p-12 text-destructive">Impossible de charger le PDF.</div>}
        >
          <Page
            pageNumber={page}
            width={containerWidth * zoom}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      {/* Bottom nav for mobile — with zoom controls */}
      <div className="flex items-center justify-between gap-2 p-2 border-t bg-muted/50 sm:hidden">
        <Button variant="outline" size="icon" className="h-10 w-10" onClick={prev} disabled={page <= 1}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={zoomOut}>
            <ZoomOut className="w-5 h-5" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={zoomIn}>
            <ZoomIn className="w-5 h-5" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">{page}/{numPages}</span>
        <Button variant="outline" size="icon" className="h-10 w-10" onClick={next} disabled={page >= numPages}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
