/** Ouvre un PDF privé via une URL blob same-origin (évite le blocage Chrome ERR_BLOCKED_BY_CLIENT du domaine de stockage). */
export function ouvrirOngletPdf(): Window | null {
  const w = window.open("", "_blank");
  if (w) w.document.write("<p style='font-family:sans-serif'>Chargement du PDF…</p>");
  return w;
}

function afficherBlobPdfDansOnglet(w: Window | null, blob: Blob): void {
  const blobUrl = URL.createObjectURL(blob);
  if (w && !w.closed) w.location.href = blobUrl;
  else {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "document.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
}

export function pdfBase64VersBlob(base64: string): Blob {
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return new Blob([octets], { type: "application/pdf" });
}

/** Le service renvoie le PDF contrôlé en base64 : aucune requête navigateur vers le domaine de stockage. */
export function afficherPdfBase64DansOnglet(w: Window | null, base64: string): void {
  afficherBlobPdfDansOnglet(w, pdfBase64VersBlob(base64));
}

export async function pdfPriveDepuisUrlSignee(url: string): Promise<Blob> {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pdf-prive`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ signed_url: url }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.pdf_base64) throw new Error(json?.error ?? "PDF privé illisible");
  return pdfBase64VersBlob(json.pdf_base64);
}

export async function afficherPdfDansOnglet(w: Window | null, url: string): Promise<void> {
  afficherBlobPdfDansOnglet(w, await pdfPriveDepuisUrlSignee(url));
}

export async function ouvrirPdfPriveUrl(url: string): Promise<void> {
  const onglet = ouvrirOngletPdf();
  try {
    await afficherPdfDansOnglet(onglet, url);
  } catch (error) {
    onglet?.close();
    throw error;
  }
}
