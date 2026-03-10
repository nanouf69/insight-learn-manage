import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PdfSlideViewerProps {
  url: string;
  nom: string;
  onLastPageReached?: () => void;
}

export default function PdfSlideViewer({ url, nom, onLastPageReached }: PdfSlideViewerProps) {
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeLoadedRef = useRef(false);

  const isExpanded = isNativeFullscreen || isPseudoFullscreen;

  // Build absolute URL for the PDF
  const absoluteUrl = url.startsWith("http")
    ? url
    : `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;

  // Notify last page reached after a delay (since we can't track iframe pages)
  useEffect(() => {
    if (!onLastPageReached) return;
    const timer = setTimeout(() => {
      onLastPageReached();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onLastPageReached]);

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
    if (e.key === "Escape" && isPseudoFullscreen) setIsPseudoFullscreen(false);
    if (e.key === "Escape" && isNativeFullscreen) document.exitFullscreen();
  };

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
      style={{ userSelect: "none", WebkitUserSelect: "none" as any }}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-muted/50 border-b flex-wrap">
        <span className="text-xs font-medium text-muted-foreground px-2">
          📄 {nom}
        </span>
        <div className="flex-1" />
        <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
          <Button variant="ghost" size="sm" title="Ouvrir dans un nouvel onglet">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </a>
        <Button variant="ghost" size="sm" onClick={toggleFullscreen} title="Plein écran">
          {isExpanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </Button>
      </div>

      {/* PDF inline via iframe — native browser PDF viewer */}
      <div
        className={`w-full ${isExpanded ? "flex-1" : ""}`}
        style={{
          height: isExpanded ? "100%" : "80vh",
          minHeight: isExpanded ? "100%" : "500px",
        }}
      >
        <iframe
          src={`${absoluteUrl}#toolbar=1&navpanes=0`}
          className="w-full h-full border-0"
          title={`PDF — ${nom}`}
          onLoad={() => { iframeLoadedRef.current = true; }}
        />
      </div>
    </div>
  );

  if (isPseudoFullscreen) {
    return createPortal(viewerContent, document.body);
  }

  return viewerContent;
}
