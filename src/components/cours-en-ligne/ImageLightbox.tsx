import { useState, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  decoding?: "async" | "sync" | "auto";
  onError?: () => void;
  reserveFrame?: boolean;
  frameClassName?: string;
  /** Opt-in: once loaded, the frame takes the image's own ratio (height capped by CSS) so no blank remains under it. */
  fitFrameToImage?: boolean;
}

export function ImageLightbox({ src, alt, className, loading, decoding, onError, reserveFrame = false, frameClassName, fitFrameToImage = false }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [fitted, setFitted] = useState<{ src: string; w: number; h: number } | null>(null);
  const readNatural = useCallback((img: HTMLImageElement | null) => {
    if (!fitFrameToImage || !img || !img.naturalWidth || !img.naturalHeight) return;
    setFitted((prev) => (prev?.src === src && prev.w === img.naturalWidth && prev.h === img.naturalHeight ? prev : { src, w: img.naturalWidth, h: img.naturalHeight }));
  }, [fitFrameToImage, src]);
  // Already-decoded (cached) images may not emit a new load event.
  useLayoutEffect(() => { if (imgRef.current?.complete) readNatural(imgRef.current); }, [readNatural]);
  const ratio = fitFrameToImage && fitted?.src === src ? fitted : null;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, close]);

  return (
    <>
      <div
        className={reserveFrame ? (frameClassName ?? "w-full aspect-[4/3] overflow-hidden") : "contents"}
        data-frame-fitted={ratio ? "" : undefined}
        style={ratio ? { aspectRatio: `${ratio.w} / ${ratio.h}`, maxWidth: `calc(var(--road-safety-image-h) * ${ratio.w / ratio.h})` } : undefined}
      >
      <img
        ref={imgRef}
        onLoad={(e) => readNatural(e.currentTarget)}
        src={src}
        alt={alt}
        className={`${className ?? ""} ${reserveFrame ? "w-full h-full object-contain" : ""} cursor-pointer hover:opacity-80 transition-opacity`}
        loading={loading}
        decoding={decoding}
        onError={onError}
        onClick={() => setOpen(true)}
        title="Cliquer pour agrandir"
      />
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={close}
        >
          <button
            onClick={close}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
