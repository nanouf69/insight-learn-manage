import { useState, useEffect } from "react";
import type React from "react";
import { resolveExamQuestionImageUrl, addCacheBuster } from "./examens-blancs-utils";
import { ImageLightbox } from "./ImageLightbox";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSignedUrl, signCourseObject } from "@/lib/signedCourseUrlCache";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const STORAGE_URL = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1` : "";

function normalizeSignedUrl(signedUrl: string): string {
  if (/^https?:\/\//i.test(signedUrl)) return signedUrl;
  if (signedUrl.startsWith("/storage/v1/")) return SUPABASE_URL ? `${SUPABASE_URL}${signedUrl}` : signedUrl;
  if (signedUrl.startsWith("/object/")) return STORAGE_URL ? `${STORAGE_URL}${signedUrl}` : signedUrl;
  if (signedUrl.startsWith("object/")) return STORAGE_URL ? `${STORAGE_URL}/${signedUrl}` : signedUrl;
  return signedUrl;
}

function extractStorageObject(input: string): { bucket: string; path: string } | null {
  if (/^question-images\//i.test(input)) {
    return { bucket: "cours-fichiers", path: input };
  }

  const fullUrlMatch = input.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?#]+)/);
  if (fullUrlMatch) {
    return {
      bucket: decodeURIComponent(fullUrlMatch[1]),
      path: decodeURIComponent(fullUrlMatch[2]),
    };
  }

  const relativeMatch = input.match(/^\/?object\/(?:public|sign)\/([^/]+)\/([^?#]+)/);
  if (relativeMatch) {
    return {
      bucket: decodeURIComponent(relativeMatch[1]),
      path: decodeURIComponent(relativeMatch[2]),
    };
  }

  return null;
}

/**
 * If url points to a private Supabase Storage object (public URL for a private bucket
 * like `cours-fichiers` returns 400), extract bucket + path and return a signed URL.
 * Otherwise returns the input url unchanged.
 */
const PAGE_CACHE_TOKEN = Date.now();

async function toDisplayableUrl(url: string): Promise<string> {
  const object = extractStorageObject(url);
  if (!object) return url;
  const { bucket, path } = object;
  const signed = await signCourseObject(bucket, path, async () => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
    return error || !data?.signedUrl ? null : normalizeSignedUrl(data.signedUrl);
  });
  return signed ?? url;
}

/** Loading reservation for question images = the caller's own height cap (max-h or h class), else 10rem. */
export function questionImageReserveHeight(className?: string): string {
  const c = className ?? "";
  const bracket = c.match(/(?:^|\s)max-h-\[([^\]\s]+)\]/);
  if (bracket) return bracket[1].replace(/_/g, " ");
  const scale = c.match(/(?:^|\s)max-h-(\d+(?:\.\d+)?)(?=\s|$)/) ?? c.match(/(?:^|\s)h-(\d+(?:\.\d+)?)(?=\s|$)/);
  if (scale) return `${Number(scale[1]) * 0.25}rem`;
  return "10rem";
}

export function ExamQuestionImage({
  image,
  alt,
  className,
  fallbackClassName,
  frameClassName,
  fitFrameToImage = false,
}: {
  image: unknown;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  frameClassName?: string;
  fitFrameToImage?: boolean;
}) {
  const resolvedUrl = resolveExamQuestionImageUrl(image);
  const cachedFor = (u: string | null) => {
    if (!u) return null;
    const o = extractStorageObject(u);
    return o ? getCachedSignedUrl(o.bucket, o.path) : null;
  };
  const [displayUrl, setDisplayUrl] = useState<string | null>(() => cachedFor(resolvedUrl));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHasError(false);
    const cached = cachedFor(resolvedUrl);
    setDisplayUrl((prev) => (prev === cached ? prev : cached));
    if (!resolvedUrl || cached) return;
    toDisplayableUrl(resolvedUrl).then((u) => {
      if (!cancelled) setDisplayUrl((prev) => (prev === u ? prev : u));
    });
    return () => {
      cancelled = true;
    };
  }, [resolvedUrl]);

  // Callers without a dedicated frame get a frame that hugs the visible image (no blank under it).
  const fitContent = frameClassName ? undefined : {
    reserveHeight: questionImageReserveHeight(className),
    fullWidth: /(?:^|\s)w-full(?=\s|$)/.test(className ?? ""),
  };

  if (!resolvedUrl) return <p className={fallbackClassName ?? "mt-2 text-xs text-muted-foreground italic"}>Image non disponible</p>;
  if (hasError && (fitContent || fitFrameToImage)) {
    return <p className={fallbackClassName ?? "mt-2 text-xs text-muted-foreground italic"}>Image non disponible</p>;
  }
  if (!displayUrl && fitContent) {
    return (
      <div className="question-image-frame" aria-busy="true" style={{ "--question-image-reserve": fitContent.reserveHeight } as React.CSSProperties}>
        <div className="h-full w-full rounded-lg border bg-muted animate-pulse" />
      </div>
    );
  }
  if (hasError) {
    return <div className={frameClassName ?? "w-full aspect-[4/3] overflow-hidden"}><p className={fallbackClassName ?? "mt-2 text-xs text-muted-foreground italic"}>Image non disponible</p></div>;
  }

  if (!displayUrl) {
    return <div className={frameClassName ?? "w-full aspect-[4/3] overflow-hidden"}><div className={className ?? "mt-2 h-40 w-full max-w-xs rounded-lg border bg-muted animate-pulse"} /></div>;
  }

  // Signed URLs are already unique; a per-mount cache-buster forced a reload (visible jump) on every rerender/remount.
  const src = extractStorageObject(resolvedUrl) ? displayUrl : addCacheBuster(displayUrl, PAGE_CACHE_TOKEN);
  return (
    <ImageLightbox
      reserveFrame
      frameClassName={frameClassName}
      fitFrameToImage={fitFrameToImage}
      fitContent={fitContent}
      src={src}
      alt={alt}
      loading="eager"
      decoding="async"
      onError={() => setHasError(true)}
      className={className ?? "mt-2 max-h-40 rounded-lg border"}
    />
  );
}
