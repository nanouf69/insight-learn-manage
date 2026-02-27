import { useState, useRef } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PptxZoomableViewerProps {
  url: string;
  nom: string;
}

export default function PptxZoomableViewer({ url, nom }: PptxZoomableViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomIn = () => setZoom((z) => Math.min(z + 0.2, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));
  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleFullscreen = () => {
    containerRef.current?.requestFullscreen?.();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setDragging(true);
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
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

  return (
    <div className="border rounded-lg overflow-hidden" ref={containerRef}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-muted/50 border-b">
        <Button variant="ghost" size="sm" onClick={zoomOut} title="Dézoomer">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="sm" onClick={zoomIn} title="Zoomer">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={resetZoom} title="Réinitialiser">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={handleFullscreen} title="Plein écran">
          <Maximize className="w-4 h-4" />
        </Button>
      </div>
      {/* Viewer */}
      <div
        style={{ height: "750px", cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
        className="overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <iframe
          src={url}
          style={{
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: "top left",
            border: "none",
            pointerEvents: dragging ? "none" : "auto",
          }}
          allowFullScreen
          title={`Aperçu ${nom}`}
        />
      </div>
    </div>
  );
}
