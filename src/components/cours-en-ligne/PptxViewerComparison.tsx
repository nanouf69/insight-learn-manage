import { useEffect, useMemo, useState, useCallback } from "react";
import { Eye, FileImage, ZoomIn, ZoomOut, Images, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import PdfSlideViewer from "./PdfSlideViewer";

interface PptxViewerComparisonProps {
  googleViewerUrl: string;
  msViewerUrl: string;
  absoluteFileUrl: string;
  nom: string;
  imageUrls?: string[];
  pdfUrl?: string;
  studentOnly?: boolean;
  onLastPageReached?: () => void;
}

export default function PptxViewerComparison({
  googleViewerUrl,
  msViewerUrl,
  nom,
  imageUrls,
  pdfUrl,
  studentOnly = false,
  onLastPageReached,
}: PptxViewerComparisonProps) {
  const [mode, setMode] = useState<"google" | "google-zoom" | "ms-office" | "images" | "pdf">(
    pdfUrl ? "pdf" : "google"
  );
  const [zoomLevel, setZoomLevel] = useState(1.2);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const handleIframeLoad = useCallback(() => setIframeLoading(false), []);

  const hasImages = imageUrls && imageUrls.length > 0;

  // Students are restricted to non-downloadable viewers
  const isStudentRestricted = studentOnly;
  const effectiveMode: "google" | "google-zoom" | "ms-office" | "images" | "pdf" = isStudentRestricted
    ? (pdfUrl ? "pdf" : hasImages ? "images" : "google")
    : mode;

  // Reset loading state when mode changes
  useEffect(() => {
    if (effectiveMode === "google" || effectiveMode === "google-zoom" || effectiveMode === "ms-office") {
      setIframeLoading(true);
    }
  }, [effectiveMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1024px)");
    const update = (event: MediaQueryListEvent | MediaQueryList) => setIsCompactViewport(event.matches);

    update(mql);

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", update as (event: MediaQueryListEvent) => void);
      return () => mql.removeEventListener("change", update as (event: MediaQueryListEvent) => void);
    }

    const legacyMql = mql as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };

    legacyMql.addListener?.(update as (event: MediaQueryListEvent) => void);
    return () => legacyMql.removeListener?.(update as (event: MediaQueryListEvent) => void);
  }, []);

  useEffect(() => {
    if (isStudentRestricted && pdfUrl) {
      setMode("pdf");
      return;
    }

    if (isStudentRestricted && hasImages) {
      setMode("images");
      return;
    }

    if (isStudentRestricted) {
      setMode("google");
      return;
    }

    if (isCompactViewport && mode === "google-zoom") {
      setMode("google");
    }
  }, [isStudentRestricted, pdfUrl, hasImages, isCompactViewport, mode]);

  useEffect(() => {
    if (!onLastPageReached || effectiveMode !== "images" || !hasImages) return;
    if (currentSlide === imageUrls.length - 1) {
      onLastPageReached();
    }
  }, [currentSlide, effectiveMode, hasImages, imageUrls, onLastPageReached]);

  // Google Docs viewer — use gview for horizontal slide rendering with no download
  const googleSingleSlideUrl = useMemo(() => {
    try {
      const url = new URL(googleViewerUrl);
      url.searchParams.set("embedded", "true");
      url.searchParams.set("chrome", "false");
      url.searchParams.set("rm", "minimal");
      return url.toString();
    } catch {
      return googleViewerUrl;
    }
  }, [googleViewerUrl]);

  const viewerHeightClass = isCompactViewport
    ? "h-[72vh] min-h-[360px] max-h-[84vh]"
    : "h-[68vh] min-h-[560px] max-h-[680px]";

  return (
    <div className="space-y-2">
      {!isStudentRestricted && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">Mode :</span>
          <div className="flex rounded-lg border bg-muted/30 p-0.5 gap-0.5">
            {pdfUrl && (
              <Button
                variant={mode === "pdf" ? "default" : "ghost"}
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => setMode("pdf")}
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                PDF HD
              </Button>
            )}
            <Button
              variant={mode === "google-zoom" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => setMode("google-zoom")}
            >
              <ZoomIn className="w-3.5 h-3.5 mr-1" />
              Google Zoomé
            </Button>
            <Button
              variant={mode === "google" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => setMode("google")}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Google Normal
            </Button>
            <Button
              variant={mode === "ms-office" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => setMode("ms-office")}
            >
              <FileImage className="w-3.5 h-3.5 mr-1" />
              Microsoft
            </Button>
            {hasImages && (
              <Button
                variant={mode === "images" ? "default" : "ghost"}
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => setMode("images")}
              >
                <Images className="w-3.5 h-3.5 mr-1" />
                Images HD
              </Button>
            )}
          </div>

          {mode === "google-zoom" && !isCompactViewport && (
            <div className="flex items-center gap-2 ml-2">
              <ZoomOut className="w-3.5 h-3.5 text-muted-foreground" />
              <Slider
                value={[zoomLevel]}
                onValueChange={([v]) => setZoomLevel(v)}
                min={1}
                max={2}
                step={0.05}
                className="w-24"
              />
              <ZoomIn className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{Math.round(zoomLevel * 100)}%</span>
            </div>
          )}
        </div>
      )}

      <div className="w-full max-w-[1280px] mx-auto">
        {effectiveMode === "pdf" && pdfUrl && (
          <PdfSlideViewer url={pdfUrl} nom={nom} onLastPageReached={onLastPageReached} />
        )}

        {effectiveMode === "google" && (
          <div className="border rounded-lg overflow-hidden relative" onContextMenu={e => e.preventDefault()}>
            {iframeLoading && (
              <div className={`absolute inset-0 z-10 flex items-center justify-center bg-muted/80 backdrop-blur-sm ${viewerHeightClass}`}>
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground font-medium">Chargement du document…</span>
                </div>
              </div>
            )}
            <div className={`w-full ${viewerHeightClass} max-w-[1210px] mx-auto`}>
              <iframe
                src={googleSingleSlideUrl}
                className="w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                onLoad={handleIframeLoad}
                title={`Google Slides — ${nom}`}
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
            {onLastPageReached && (
              <div className="p-2 border-t bg-muted/40 flex justify-center">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onLastPageReached()}
                  className="gap-2"
                >
                  ✅ J'ai parcouru toutes les slides
                </Button>
              </div>
            )}
          </div>
        )}

        {effectiveMode === "google-zoom" && !isCompactViewport && (
          <div className="border rounded-lg overflow-hidden">
            <div
              className={`w-full ${viewerHeightClass} max-w-[1210px] mx-auto relative overflow-hidden`}
            >
              <iframe
                src={googleSingleSlideUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "center center",
                }}
                allowFullScreen
                title={`Google Slides Zoomé — ${nom}`}
              />
            </div>
            {onLastPageReached && (
              <div className="p-2 border-t bg-muted/40 flex justify-center">
                <Button variant="default" size="sm" onClick={() => onLastPageReached()} className="gap-2">
                  ✅ J'ai parcouru toutes les slides
                </Button>
              </div>
            )}
          </div>
        )}

        {effectiveMode === "ms-office" && (
          <div className="border rounded-lg overflow-hidden">
            <div className={`w-full ${viewerHeightClass} max-w-[1210px] mx-auto`}>
              <iframe
                src={msViewerUrl}
                className="w-full h-full border-0"
                allowFullScreen
                title={`MS Office — ${nom}`}
              />
            </div>
            {onLastPageReached && (
              <div className="p-2 border-t bg-muted/40 flex justify-center">
                <Button variant="default" size="sm" onClick={() => onLastPageReached()} className="gap-2">
                  ✅ J'ai parcouru toutes les slides
                </Button>
              </div>
            )}
          </div>
        )}

        {effectiveMode === "images" && hasImages && (
          <div className="border rounded-lg overflow-hidden bg-black/95">
            <div className={`w-full ${viewerHeightClass} flex flex-col items-center justify-center`}>
              <img
                src={imageUrls[currentSlide]}
                alt={`Slide ${currentSlide + 1}`}
                className="max-w-full max-h-[calc(100%-3rem)] object-contain"
              />
              <div className="flex items-center gap-3 py-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentSlide === 0}
                  onClick={() => setCurrentSlide((p) => p - 1)}
                >
                  ← Précédent
                </Button>
                <span className="text-xs text-white/70">
                  {currentSlide + 1} / {imageUrls.length}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentSlide === imageUrls.length - 1}
                  onClick={() => setCurrentSlide((p) => p + 1)}
                >
                  Suivant →
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
