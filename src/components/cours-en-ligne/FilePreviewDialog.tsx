import { useEffect, useState } from "react";
import { Eye, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import PdfSlideViewer from "./PdfSlideViewer";

interface Props {
  url: string;
  nom?: string;
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const STORAGE_URL = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1` : "";

function normalizeSignedStorageUrl(signedUrl: string): string {
  if (/^https?:\/\//i.test(signedUrl)) return signedUrl;
  if (signedUrl.startsWith("/storage/v1/")) return SUPABASE_URL ? `${SUPABASE_URL}${signedUrl}` : signedUrl;
  if (signedUrl.startsWith("/object/")) return STORAGE_URL ? `${STORAGE_URL}${signedUrl}` : signedUrl;
  if (signedUrl.startsWith("object/")) return STORAGE_URL ? `${STORAGE_URL}/${signedUrl}` : signedUrl;
  return signedUrl;
}

function resolveAppFileUrl(fileUrl: string): string {
  if (!fileUrl) return "";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  if (fileUrl.startsWith("/storage/v1/")) return SUPABASE_URL ? `${SUPABASE_URL}${fileUrl}` : fileUrl;

  const normalizedPath = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
  if (typeof window === "undefined") return normalizedPath;

  const fallbackPublicOrigin = "https://insight-learn-manage.lovable.app";
  const isPreviewHost = window.location.hostname.endsWith("lovableproject.com");
  const baseOrigin = isPreviewHost ? fallbackPublicOrigin : window.location.origin;
  return `${baseOrigin}${normalizedPath}`;
}

function extractCourseStorageObject(input: string): { bucket: string; path: string } | null {
  if (/^(question-images|cours-images|cours-pdfs|vtc)\//i.test(input)) {
    return { bucket: "cours-fichiers", path: input };
  }

  const storageMatch = input.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?#]+)/);
  if (storageMatch) {
    return {
      bucket: decodeURIComponent(storageMatch[1]),
      path: decodeURIComponent(storageMatch[2]),
    };
  }

  const objectMatch = input.match(/^\/?object\/(?:public|sign)\/([^/]+)\/([^?#]+)/);
  if (objectMatch) {
    return {
      bucket: decodeURIComponent(objectMatch[1]),
      path: decodeURIComponent(objectMatch[2]),
    };
  }

  return null;
}

async function toDisplayableCourseUrl(fileUrl: string): Promise<string> {
  const resolvedUrl = resolveAppFileUrl(fileUrl);
  try {
    const storageObject = extractCourseStorageObject(fileUrl) ?? extractCourseStorageObject(resolvedUrl);
    if (!storageObject) return resolvedUrl;

    const { data, error } = await supabase.storage
      .from(storageObject.bucket)
      .createSignedUrl(storageObject.path, 60 * 60);

    if (error || !data?.signedUrl) return resolvedUrl;
    return normalizeSignedStorageUrl(data.signedUrl);
  } catch {
    return resolvedUrl;
  }
}

/**
 * Bouton "Aperçu" : ouvre le support (PDF/PowerPoint converti) dans une fenêtre
 * afin de contrôler visuellement qu'il s'agit bien du bon document.
 */
export default function FilePreviewDialog({ url, nom }: Props) {
  const [open, setOpen] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string | null>(() => {
    const storageObject = extractCourseStorageObject(url) ?? extractCourseStorageObject(resolveAppFileUrl(url));
    return storageObject ? null : resolveAppFileUrl(url);
  });
  const isPdf = /\.pdf(\?|$)/i.test(url);
  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?|$)/i.test(url);

  useEffect(() => {
    let cancelled = false;
    const storageObject = extractCourseStorageObject(url) ?? extractCourseStorageObject(resolveAppFileUrl(url));
    setDisplayUrl(storageObject ? null : resolveAppFileUrl(url));
    toDisplayableCourseUrl(url).then((nextUrl) => {
      if (!cancelled) setDisplayUrl(nextUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);


  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors text-[11px]"
        title="Aperçu du support"
      >
        <Eye className="w-3.5 h-3.5" />
        Aperçu
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-4">
          <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <DialogTitle className="text-base truncate">
              {nom || "Aperçu du support"}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 mr-8"
              disabled={!displayUrl}
              onClick={() => {
                if (!displayUrl) return;
                window.open(displayUrl, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="w-4 h-4" />
              Ouvrir
            </Button>
          </DialogHeader>

          <div className="flex-1 min-h-0 rounded-md border overflow-auto bg-muted">
            {!displayUrl ? (
              <div className="h-full flex items-center justify-center p-6 text-sm text-muted-foreground">
                Préparation du PDF sécurisé…
              </div>
            ) : isPdf ? (
              <PdfSlideViewer url={displayUrl} nom={nom || "Aperçu"} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
                <p>Ce format ne peut pas être affiché directement dans le navigateur.</p>
                <Button onClick={() => window.open(displayUrl, "_blank", "noopener,noreferrer")}>
                  Télécharger / ouvrir le fichier
                </Button>
              </div>
            )}
          </div>

          {displayUrl && <p className="text-[11px] text-muted-foreground break-all">{displayUrl}</p>}

        </DialogContent>
      </Dialog>
    </>
  );
}
