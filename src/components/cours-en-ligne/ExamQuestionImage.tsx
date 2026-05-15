import { useState, useEffect, useRef } from "react";
import { resolveExamQuestionImageUrl } from "./examens-blancs-utils";
import { ImageLightbox } from "./ImageLightbox";

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
  const previousUrlRef = useRef<string | null>(resolvedUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (previousUrlRef.current !== resolvedUrl) {
      previousUrlRef.current = resolvedUrl;
      setHasError(false);
    }
  }, [resolvedUrl]);

  if (!resolvedUrl || hasError) {
    return <p className={fallbackClassName ?? "mt-2 text-xs text-muted-foreground italic"}>Image non disponible</p>;
  }

  const src = resolvedUrl;
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
