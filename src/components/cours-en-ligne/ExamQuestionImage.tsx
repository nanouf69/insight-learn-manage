import { useState, useEffect } from "react";
import { resolveExamQuestionImageUrl, addCacheBuster } from "./examens-blancs-utils";
import { ImageLightbox } from "./ImageLightbox";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");

/**
 * If url points to a private Supabase Storage object (public URL for a private bucket
 * like `cours-fichiers` returns 400), extract bucket + path and return a signed URL.
 * Otherwise returns the input url unchanged.
 */
async function toDisplayableUrl(url: string): Promise<string> {
  try {
    // Match both public and sign paths so we recover from either
    const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?#]+)/);
    if (!m) return url;
    const bucket = decodeURIComponent(m[1]);
    const path = decodeURIComponent(m[2]);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) return url;
    return data.signedUrl;
  } catch {
    return url;
  }
}

export function ExamQuestionImage({
  image,
  alt,
  className,
  fallbackClassName,
}: {
  image: unknown;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const resolvedUrl = resolveExamQuestionImageUrl(image);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [cacheToken, setCacheToken] = useState<number>(() => Date.now());
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHasError(false);
    if (!resolvedUrl) {
      setDisplayUrl(null);
      return;
    }
    setCacheToken(Date.now());
    toDisplayableUrl(resolvedUrl).then((u) => {
      if (!cancelled) setDisplayUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [resolvedUrl]);

  if (!resolvedUrl || hasError) {
    return <p className={fallbackClassName ?? "mt-2 text-xs text-muted-foreground italic"}>Image non disponible</p>;
  }

  if (!displayUrl) {
    return <div className={className ?? "mt-2 h-40 w-full max-w-xs rounded-lg border bg-muted animate-pulse"} />;
  }

  const src = addCacheBuster(displayUrl, cacheToken);
  return (
    <ImageLightbox
      src={src}
      alt={alt}
      loading="eager"
      decoding="async"
      onError={() => setHasError(true)}
      className={className ?? "mt-2 max-h-40 rounded-lg border"}
    />
  );
}
