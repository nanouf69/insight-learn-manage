import { useEffect, useState } from "react";
import { Document, Page } from "react-pdf";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ensurePdfWorker } from "@/lib/pdfWorker";
import { telechargerBlob } from "@/lib/attestationFinValidee/pdf";
ensurePdfWorker();
export function ApercuPdfAttestation({ blob, onClose }: { blob: Blob | null; onClose: () => void }) {
  const [width, setWidth] = useState(600);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!container) return;
    const r = new ResizeObserver(entries => setWidth(Math.max(1, entries[0].contentRect.width)));
    r.observe(container); return () => r.disconnect();
  }, [container]);
  return <Dialog open={!!blob} onOpenChange={o => !o && onClose()}>
    <DialogContent className="max-w-3xl w-[calc(100%-1rem)] max-h-[94dvh] overflow-y-auto p-3 sm:p-6">
      <DialogHeader><DialogTitle>Attestation — brouillon non valable</DialogTitle></DialogHeader>
      {blob && <Button variant="outline" className="gap-2 w-fit min-h-11" onClick={() => telechargerBlob(blob, "Attestation_brouillon.pdf")}><Download className="h-4 w-4" />Télécharger le brouillon</Button>}
      <div ref={setContainer} className="min-w-0 w-full" data-testid="attestation-pdf-apercu">
        {blob && <Document file={blob} loading={<Loader2 className="animate-spin" />} error={<p role="alert">Lecture du PDF impossible.</p>}><Page pageNumber={1} width={width} renderTextLayer={false} renderAnnotationLayer={false} /></Document>}
      </div>
    </DialogContent>
  </Dialog>;
}