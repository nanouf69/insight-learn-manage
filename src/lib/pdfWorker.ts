import { pdfjs } from "react-pdf";
// Vite bundle le worker et renvoie une URL valide (même origine, sans CORS).
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Polyfill Promise.withResolvers (Safari < 17 / Samsung Internet) — fil principal.
// (index.html le pose déjà avant tout script ; ceci reste un filet.)
const promiseAvecResolvers = Promise as unknown as { withResolvers?: unknown };
const withResolversNatif =
  typeof promiseAvecResolvers.withResolvers === "function" &&
  /\[native code\]/.test(Function.prototype.toString.call(promiseAvecResolvers.withResolvers));
if (typeof promiseAvecResolvers.withResolvers === "undefined") {
  (Promise as unknown as { withResolvers: unknown }).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}

/**
 * Le worker pdf.js s'exécute dans un AUTRE contexte global : le polyfill du
 * fil principal ne s'y applique pas. Sur Samsung Internet 21 / Chrome < 119
 * (sans Promise.withResolvers natif), le worker plantait avec
 * « Promise.withResolvers is not a function » (journaux jusqu'au 29/10).
 * Pour ces navigateurs seulement, on démarre un petit worker module qui pose
 * le polyfill PUIS importe le vrai worker (même fichier, même origine).
 */
export function sourceWorkerCompatible(
  urlWorker: string,
  natif: boolean,
  baseHref: string,
  creerUrlBlob: (code: string) => string | null,
): string {
  if (natif) return urlWorker;
  try {
    const absolu = new URL(urlWorker, baseHref).href;
    const code =
      "if(typeof Promise.withResolvers!=='function'){Promise.withResolvers=function(){var a,b;var p=new Promise(function(r,j){a=r;b=j});return{promise:p,resolve:a,reject:b}}}\n" +
      `import ${JSON.stringify(absolu)};\n`;
    return creerUrlBlob(code) ?? urlWorker;
  } catch {
    return urlWorker;
  }
}

let configured = false;

/** Configure une seule fois le worker pdf.js utilisé par react-pdf. */
export function ensurePdfWorker() {
  if (configured) return;
  configured = true;
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = sourceWorkerCompatible(
      pdfWorkerUrl,
      withResolversNatif,
      typeof window !== "undefined" ? window.location.href : "http://localhost/",
      (code) => {
        if (typeof Blob === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return null;
        return URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
      },
    );
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
