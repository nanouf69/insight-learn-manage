import { useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  decoding?: "async" | "sync" | "auto";
  onError?: () => void;
  reserveFrame?: boolean;
}

export function ImageLightbox({ src, alt, className, loading, decoding, onError, reserveFrame = false }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

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
      <div className={reserveFrame ? "w-full aspect-[4/3] overflow-hidden" : "contents"}>
      <img
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
