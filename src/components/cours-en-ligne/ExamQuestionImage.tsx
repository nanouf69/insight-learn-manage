import { useState, useEffect } from "react";
import { resolveExamQuestionImageUrl, addCacheBuster } from "./examens-blancs-utils";

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
  const [cacheToken, setCacheToken] = useState<number>(() => Date.now());
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    if (resolvedUrl) {
      setCacheToken(Date.now());
    }
  }, [resolvedUrl]);

  if (!resolvedUrl || hasError) {
    return <p className={fallbackClassName ?? "mt-2 text-xs text-muted-foreground italic"}>Image non disponible</p>;
  }

  const src = addCacheBuster(resolvedUrl, cacheToken);
  return (
    <img
      src={src}
      alt={alt}
      loading="eager"
      decoding="async"
      onError={() => setHasError(true)}
      className={className ?? "mt-2 max-h-40 rounded-lg border"}
    />
  );
}
