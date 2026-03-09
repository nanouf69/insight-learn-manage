import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";

// Use bundled worker import for maximum browser compatibility (avoids CORS/CDN issues)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PdfSlideViewerProps {
  url: string;
  nom: string;
  onLastPageReached?: () => void;
}

export default function PdfSlideViewer({ url, nom, onLastPageReached }: PdfSlideViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(960);

  const isExpanded = isNativeFullscreen || isPseudoFullscreen;

  // Recalculate width on resize / fullscreen changes
  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(Math.max(320, containerRef.current.clientWidth - 16));
    }
  }, []);

  useEffect(() => {
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateWidth, isPseudoFullscreen]);

  // Listen for native fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Lock page scroll in pseudo fullscreen mode & try to lock orientation
  useEffect(() => {
    if (!isPseudoFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Try to lock screen orientation to landscape (works on Android Chrome)
    try {
      (screen.orientation as any)?.lock?.("landscape").catch(() => {});
    } catch {}

    return () => {
      document.body.style.overflow = previousOverflow;
      try {
        screen.orientation?.unlock?.();
      } catch {}
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
  const next = () => setPage((p) => {
    const nextPage = Math.min(numPages, p + 1);
    if (nextPage === numPages && onLastPageReached) {
      onLastPageReached();
    }
    return nextPage;
  });
  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
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
        if (!document.fullscreenElement) {
          setIsPseudoFullscreen(true);
        }
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

  // Detect portrait mobile for CSS rotation fallback
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 768px) and (orientation: portrait)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsPortraitMobile(e.matches);
    handler(mql);
    mql.addEventListener("change", handler as any);
    return () => mql.removeEventListener("change", handler as any);
  }, []);

  const rotateLandscape = isPseudoFullscreen && isPortraitMobile;

  const viewerContent = (
    <div
      ref={containerRef}
      className={`border overflow-hidden focus:outline-none ${
        isPseudoFullscreen
          ? "fixed inset-0 z-[9999] rounded-none bg-black flex flex-col"
          : isExpanded
            ? "rounded-none bg-black flex flex-col"
            : "rounded-lg bg-muted/30"
      }`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={rotateLandscape ? {
        userSelect: "none",
        WebkitUserSelect: "none" as any,
        transform: "rotate(90deg)",
        transformOrigin: "top left",
        width: "100vh",
        height: "100vw",
        top: 0,
        left: "100vw",
      } : { userSelect: "none", WebkitUserSelect: "none" as any }}
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
        style={{
          maxHeight: isExpanded ? "none" : "80vh",
          height: isExpanded ? "100%" : "auto",
          touchAction: "pan-x pan-y",
        }}
      >
        {loadError ? (
          <div className="flex flex-col items-center justify-center p-12 gap-4">
            <p className="text-muted-foreground text-sm text-center">
              Le PDF ne s'affiche pas ? Essayez de le télécharger ou de l'ouvrir dans un nouvel onglet.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setLoadError(false); setRetryCount(r => r + 1); }}>
                Réessayer
              </Button>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Button variant="default" size="sm">Ouvrir dans un nouvel onglet</Button>
              </a>
            </div>
          </div>
        ) : (
          <Document
            key={retryCount}
            file={url}
            onLoadSuccess={(data) => { setLoadError(false); onDocumentLoadSuccess(data); }}
            onLoadError={() => setLoadError(true)}
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
        )}
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

  if (isPseudoFullscreen) {
    return createPortal(viewerContent, document.body);
  }

  return viewerContent;
}
