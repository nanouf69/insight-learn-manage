import { pdfjs } from "react-pdf";
// Vite bundle le worker et renvoie une URL valide (même origine, sans CORS).
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Polyfill Promise.withResolvers (Safari < 17 / Samsung Internet)
if (typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers === "undefined") {
  (Promise as unknown as { withResolvers: unknown }).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}

let configured = false;

/** Configure une seule fois le worker pdf.js utilisé par react-pdf. */
export function ensurePdfWorker() {
  if (configured) return;
  configured = true;
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  } catch {
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  }
}

/** URL réellement utilisée par pdf.js (utile pour diagnostiquer un aperçu vide). */
export function getPdfWorkerSrc(): string {
  return pdfjs.GlobalWorkerOptions.workerSrc;
}

ensurePdfWorker();
