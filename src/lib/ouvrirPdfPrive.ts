/** Ouvre un PDF privé via une URL blob same-origin (évite le blocage Chrome ERR_BLOCKED_BY_CLIENT du domaine de stockage). */
export function ouvrirOngletPdf(): Window | null {
  const w = window.open("", "_blank");
  if (w) w.document.write("<p style='font-family:sans-serif'>Chargement du PDF…</p>");
  return w;
}
export async function afficherPdfDansOnglet(w: Window | null, url: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("PDF illisible (" + res.status + ")");
  const blob = new Blob([await res.arrayBuffer()], { type: "application/pdf" });
  const blobUrl = URL.createObjectURL(blob);
  if (w && !w.closed) w.location.href = blobUrl;
  else { const a = document.createElement("a"); a.href = blobUrl; a.download = "document.pdf"; document.body.appendChild(a); a.click(); a.remove(); }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
}
