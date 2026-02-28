import { useMemo, useState } from "react";
import { Eye, FileImage, ZoomIn, ZoomOut, Images, FileText } from "lucide-react";
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
}

export default function PptxViewerComparison({
  googleViewerUrl,
  msViewerUrl,
  nom,
  imageUrls,
  pdfUrl,
}: PptxViewerComparisonProps) {
  const [mode, setMode] = useState<"google" | "google-zoom" | "ms-office" | "images" | "pdf">(
    pdfUrl ? "pdf" : "google-zoom"
  );
  const [zoomLevel, setZoomLevel] = useState(1.25);
  const [currentSlide, setCurrentSlide] = useState(0);

  const hasImages = imageUrls && imageUrls.length > 0;

  const googleSingleSlideUrl = useMemo(() => {
    try {
      const url = new URL(googleViewerUrl);
      url.searchParams.set("embedded", "true");
      url.searchParams.set("pid", "explorer");
      url.searchParams.set("chrome", "false");
      url.searchParams.set("efh", "false");
      url.searchParams.set("a", "v");
      return url.toString();
    } catch {
      return googleViewerUrl;
    }
  }, [googleViewerUrl]);

  return (
    <div className="space-y-2">
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

        {mode === "google-zoom" && (
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

      <div className="w-full max-w-[1280px] mx-auto">
        {mode === "pdf" && pdfUrl && (
          <PdfSlideViewer url={pdfUrl} nom={nom} />
        )}

        {mode === "google" && (
          <div className="border rounded-lg overflow-hidden">
            <div className="w-full h-[68vh] min-h-[560px] max-h-[680px] max-w-[1210px] mx-auto">
              <iframe
                src={googleSingleSlideUrl}
                className="w-full h-full border-0"
                allowFullScreen
                title={`Google Slides — ${nom}`}
              />
            </div>
          </div>
        )}

        {mode === "google-zoom" && (
          <div className="border rounded-lg overflow-hidden">
            <div
              className="w-full h-[68vh] min-h-[560px] max-h-[680px] max-w-[1210px] mx-auto relative"
              style={{ overflow: "hidden" }}
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
          </div>
        )}

        {mode === "ms-office" && (
          <div className="border rounded-lg overflow-hidden">
            <div className="w-full h-[68vh] min-h-[560px] max-h-[680px] max-w-[1210px] mx-auto">
              <iframe
                src={msViewerUrl}
                className="w-full h-full border-0"
                allowFullScreen
                title={`MS Office — ${nom}`}
              />
            </div>
          </div>
        )}

        {mode === "images" && hasImages && (
          <div className="border rounded-lg overflow-hidden bg-black/95">
            <div
              className="w-full flex flex-col items-center justify-center"
              style={{ height: "68vh", minHeight: "560px", maxHeight: "680px" }}
            >
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