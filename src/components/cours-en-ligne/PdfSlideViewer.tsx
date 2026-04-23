import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";

// Promise.withResolvers polyfill for Safari < 17 / Samsung Internet
if (typeof (Promise as any).withResolvers === 'undefined') {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}

// Set up pdf.js worker with maximum mobile compatibility
// Use Vite's import.meta.url to bundle the worker locally (avoids CORS / CDN issues on mobile)
try {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
} catch {
  // Fallback to CDN
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  } catch {
    // Native iframe mode will be used
  }
}

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
  const [renderMode, setRenderMode] = useState<"react-pdf" | "native">("react-pdf");
  const containerRef = useRef<HTMLDivElement>(null);
  const nativeScrollRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(960);
  const [nativeScrolledToBottom, setNativeScrolledToBottom] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasAutoFitMobile, setHasAutoFitMobile] = useState(false);

  // Detect mobile to apply mobile-friendly defaults
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mql);
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
      return () => mql.removeEventListener("change", handler as (e: MediaQueryListEvent) => void);
    }
  }, []);

  const handleNativeBottomCheck = useCallback((el: HTMLElement) => {
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining <= 48) {
      setNativeScrolledToBottom(true);
    }
  }, []);

  const isExpanded = isNativeFullscreen || isPseudoFullscreen;

  // Build absolute URL for fallback iframe
  const absoluteUrl = url.startsWith("http")
    ? url
    : `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;

  // Recalculate width on resize / fullscreen changes
  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(Math.max(320, containerRef.current.clientWidth - 16));
    }
  }, []);

  useEffect(() => {
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

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

  // Reset native completion gate when changing source/mode
  useEffect(() => {
    setNativeScrolledToBottom(false);
  }, [url, renderMode]);

  // Lock page scroll in pseudo fullscreen mode & try to lock orientation
  useEffect(() => {
    if (!isPseudoFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

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
    setLoadError(false);
    setRenderMode("react-pdf");
    updateWidth();
    // Sur mobile, auto-zoom à 1.6x pour rendre le texte des slides 16:9 lisible (une fois seulement)
    if (isMobile && !hasAutoFitMobile) {
      setZoom(1.6);
      setHasAutoFitMobile(true);
    }
  }, [updateWidth, isMobile, hasAutoFitMobile]);

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
      setIsPseudoFullscreen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
    if (e.key === "Escape" && isPseudoFullscreen) setIsPseudoFullscreen(false);
    if (e.key === "Escape" && isNativeFullscreen) document.exitFullscreen();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    const endX = e.changedTouches[0]?.clientX;
    touchStartXRef.current = null;
    if (startX == null || endX == null) return;

    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 48) return;

    if (deltaX > 0) prev();
    if (deltaX < 0) next();
  };

  // Detect portrait mobile for CSS rotation fallback
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 768px) and (orientation: portrait)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsPortraitMobile(e.matches);

    handler(mql);

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler as (event: MediaQueryListEvent) => void);
      return () => mql.removeEventListener("change", handler as (event: MediaQueryListEvent) => void);
    }

    const legacyMql = mql as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };

    legacyMql.addListener?.(handler as (event: MediaQueryListEvent) => void);
    return () => legacyMql.removeListener?.(handler as (event: MediaQueryListEvent) => void);
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
        {renderMode === "react-pdf" && (
          <>
            <Button variant="ghost" size="sm" onClick={prev} disabled={page <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium text-muted-foreground min-w-[4rem] text-center">
              {page} / {numPages || "…"}
            </span>
            <Button variant="ghost" size="sm" onClick={next} disabled={page >= numPages && numPages > 0}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button variant="ghost" size="sm" onClick={zoomOut}><ZoomOut className="w-4 h-4" /></Button>
            <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={zoomIn}><ZoomIn className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={resetZoom}><RotateCcw className="w-4 h-4" /></Button>
          </>
        )}
        {renderMode === "native" && (
          <>
            <Button variant="ghost" size="sm" onClick={zoomOut}><ZoomOut className="w-4 h-4" /></Button>
            <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={zoomIn}><ZoomIn className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={resetZoom}><RotateCcw className="w-4 h-4" /></Button>
            <div className="w-px h-5 bg-border mx-1" />
            <span className="text-xs font-medium text-muted-foreground px-1">📄 {nom}</span>
          </>
        )}
        <div className="flex-1" />
        {!isExpanded && (
          <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">Pour agrandir, cliquer ici →</span>
        )}
        <Button variant="ghost" size="sm" onClick={toggleFullscreen} title="Pour agrandir, cliquer ici">
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
        onTouchStart={renderMode === "react-pdf" ? handleTouchStart : undefined}
        onTouchEnd={renderMode === "react-pdf" ? handleTouchEnd : undefined}
        onScroll={(e) => {
          if (renderMode === "native" || loadError) {
            handleNativeBottomCheck(e.currentTarget);
          }
        }}
      >
        {renderMode === "native" || loadError ? (
          <div
            ref={nativeScrollRef}
            className="w-full h-full min-h-[420px] bg-background overflow-auto"
            onContextMenu={e => e.preventDefault()}
            onScroll={(e) => handleNativeBottomCheck(e.currentTarget)}
          >
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%` }}>
              <iframe
                src={`${absoluteUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&download=0`}
                className="w-full border-0"
                style={{ minHeight: isExpanded ? "300%" : "200vh", height: "200vh" }}
                title={`PDF — ${nom}`}
              />
            </div>
          </div>
        ) : (
          <Document
            key={retryCount}
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={() => {
              setLoadError(true);
              setRenderMode("native");
            }}
            loading={<div className="flex items-center justify-center p-12 text-muted-foreground">Chargement du PDF…</div>}
            error={<div className="flex items-center justify-center p-12 text-destructive">Impossible de charger le PDF.</div>}
          >
            <Page
              pageNumber={page}
              width={containerWidth * zoom}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              devicePixelRatio={typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 2}
            />
          </Document>
        )}
      </div>

      {renderMode === "native" && (
        <div className="p-2 border-t bg-muted/40 flex items-center justify-between">
          {onLastPageReached && nativeScrolledToBottom && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onLastPageReached()}
              className="gap-2"
            >
              ✅ J'ai parcouru toutes les slides
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoadError(false);
              setRenderMode("react-pdf");
              setRetryCount((r) => r + 1);
            }}
          >
            Revenir au mode HD
          </Button>
        </div>
      )}

      {/* Bottom nav for mobile — with zoom controls */}
      {renderMode === "react-pdf" && (
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
          <span className="text-xs text-muted-foreground">{page}/{numPages || "…"}</span>
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={next} disabled={page >= numPages && numPages > 0}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );

  if (isPseudoFullscreen) {
    return createPortal(viewerContent, document.body);
  }

  return viewerContent;
}
