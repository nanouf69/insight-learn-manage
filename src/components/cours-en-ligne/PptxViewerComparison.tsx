import { useState } from "react";
import { Eye, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PptxViewerComparisonProps {
  googleViewerUrl: string;
  msViewerUrl: string;
  absoluteFileUrl: string;
  nom: string;
}

export default function PptxViewerComparison({
  googleViewerUrl,
  msViewerUrl,
  nom,
}: PptxViewerComparisonProps) {
  const [mode, setMode] = useState<"google" | "ms-office">("google");

  return (
    <div className="space-y-2">
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
        </div>
      </div>

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
      </div>
    </div>
  );
}
