import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageCarouselViewerProps {
  /** Array of image URLs (one per slide) */
  images: string[];
  nom: string;
  onLastPageReached?: () => void;
}

export default function ImageCarouselViewer({ images, nom, onLastPageReached }: ImageCarouselViewerProps) {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPageFired = useRef(false);

  const total = images.length;

  // Preload next image
  useEffect(() => {
    if (page + 1 < total) {
      const img = new Image();
      img.src = images[page + 1];
    }
    // Also preload page+2 for smoother browsing
    if (page + 2 < total) {
      const img2 = new Image();
      img2.src = images[page + 2];
    }
  }, [page, images, total]);

  // Fire onLastPageReached when reaching the last page
  useEffect(() => {
    if (page === total - 1 && !lastPageFired.current && onLastPageReached) {
      lastPageFired.current = true;
      onLastPageReached();
    }
  }, [page, total, onLastPageReached]);

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const prev = () => { setPage((p) => Math.max(0, p - 1)); resetView(); };
  const next = () => { setPage((p) => Math.min(total - 1, p + 1)); resetView(); };
  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const fullscreen = () => containerRef.current?.requestFullscreen?.();

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      alert("Veuillez autoriser les pop-ups pour imprimer.");
      return;
    }
    const imgsHtml = images
      .map(
        (src, i) =>
          `<div class="page"><img src="${src}" alt="Slide ${i + 1}" /></div>`
      )
      .join("");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${nom}</title>
      <style>
        @page { size: A4 landscape; margin: 8mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: system-ui, sans-serif; background: #fff; }
        .page { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .page img { max-width: 100%; max-height: 100%; object-fit: contain; }
        @media print { .page { height: auto; min-height: 95vh; } }
      </style></head><body>${imgsHtml}<script>
        const imgs = document.images;
        let loaded = 0;
        const ready = () => { if (++loaded >= imgs.length) { setTimeout(() => { window.focus(); window.print(); }, 300); } };
        for (const img of imgs) { if (img.complete) ready(); else { img.onload = ready; img.onerror = ready; } }
      </script></body></html>`);
    win.document.close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) { setDragging(true); lastPos.current = { x: e.clientX, y: e.clientY }; }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging && zoom > 1) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
  };
  const handleMouseUp = () => setDragging(false);

  if (total === 0) return <div className="p-8 text-center text-muted-foreground">Aucune image de slide disponible.</div>;

  return (
    <div
      ref={containerRef}
      className="border rounded-lg overflow-hidden bg-black focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-muted/50 border-b flex-wrap">
        <Button variant="ghost" size="sm" onClick={prev} disabled={page <= 0}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs font-medium text-muted-foreground min-w-[4rem] text-center">
          {page + 1} / {total}
        </span>
        <Button variant="ghost" size="sm" onClick={next} disabled={page >= total - 1}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button variant="ghost" size="sm" onClick={zoomOut}><ZoomOut className="w-4 h-4" /></Button>
        <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="sm" onClick={zoomIn}><ZoomIn className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => resetView()}><RotateCcw className="w-4 h-4" /></Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={handlePrint} title="Imprimer la fiche">
          <Printer className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Imprimer</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={fullscreen}><Maximize className="w-4 h-4" /></Button>
      </div>

      {/* Image viewer */}
      <div
        className="flex justify-center items-center overflow-hidden relative"
        style={{ height: "68vh", minHeight: 400, maxHeight: 720, cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={images[page]}
          alt={`${nom} — Slide ${page + 1}`}
          loading="lazy"
          draggable={false}
          className="select-none"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: "center center",
            transition: dragging ? "none" : "transform 0.15s ease",
          }}
        />
      </div>

      {/* Bottom nav mobile */}
      <div className="flex items-center justify-between p-2 border-t bg-muted/50 sm:hidden">
        <Button variant="outline" size="sm" onClick={prev} disabled={page <= 0}>← Précédent</Button>
        <span className="text-xs text-muted-foreground">{page + 1}/{total}</span>
        <Button variant="outline" size="sm" onClick={next} disabled={page >= total - 1}>Suivant →</Button>
      </div>
    </div>
  );
}
