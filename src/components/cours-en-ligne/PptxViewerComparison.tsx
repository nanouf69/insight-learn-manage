import { useState, lazy, Suspense } from "react";
import { Eye, FileImage, FileText as FilePdfIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const LazyPdfViewer = lazy(() => import("./PdfSlideViewer"));

interface PptxViewerComparisonProps {
  googleViewerUrl: string;
  msViewerUrl: string;
  absoluteFileUrl: string;
  nom: string;
}

export default function PptxViewerComparison({
  googleViewerUrl,
  msViewerUrl,
  absoluteFileUrl,
  nom,
}: PptxViewerComparisonProps) {
  const [mode, setMode] = useState<"ms-office" | "google" | "pdf">("google");

  return (
    <div className="space-y-2">
      {/* Mode selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">Mode d'affichage :</span>
        <div className="flex rounded-lg border bg-muted/30 p-0.5 gap-0.5">
          <Button
            variant={mode === "google" ? "default" : "ghost"}
            size="sm"
            className="text-xs h-7 px-2.5"
            onClick={() => setMode("google")}
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Google Slides
          </Button>
          <Button
            variant={mode === "ms-office" ? "default" : "ghost"}
            size="sm"
            className="text-xs h-7 px-2.5"
            onClick={() => setMode("ms-office")}
          >
            <FileImage className="w-3.5 h-3.5 mr-1" />
            Microsoft Office
          </Button>
          <Button
            variant={mode === "pdf" ? "default" : "ghost"}
            size="sm"
            className="text-xs h-7 px-2.5"
            onClick={() => setMode("pdf")}
          >
            <FilePdfIcon className="w-3.5 h-3.5 mr-1" />
            PDF HD
          </Button>
        </div>
      </div>

      {/* Viewer */}
      <div className="w-full max-w-[1280px] mx-auto">
        {mode === "google" && (
          <div className="border rounded-lg overflow-hidden">
            <div className="w-full" style={{ height: "68vh", minHeight: "560px", maxHeight: "680px" }}>
              <iframe
                src={googleViewerUrl}
                className="w-full h-full border-0"
                allowFullScreen
                title={`Google Slides — ${nom}`}
              />
            </div>
          </div>
        )}

        {mode === "ms-office" && (
          <div className="border rounded-lg overflow-hidden">
            <div className="w-full" style={{ height: "68vh", minHeight: "560px", maxHeight: "680px" }}>
              <iframe
                src={msViewerUrl}
                className="w-full h-full border-0"
                allowFullScreen
                title={`MS Office — ${nom}`}
              />
            </div>
          </div>
        )}

        {mode === "pdf" && (
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Chargement du viewer PDF…</div>}>
            <LazyPdfViewer url={absoluteFileUrl} nom={nom} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
