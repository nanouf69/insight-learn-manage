import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import { Download, Eye, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { pdfPriveDepuisUrlSignee } from "@/lib/ouvrirPdfPrive";
import { ensurePdfWorker } from "@/lib/pdfWorker";

ensurePdfWorker();

type Props = {
  titre: string;
  nomFichier: string;
  chargerUrl: () => Promise<string>;
  ouvrirLabel?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
};

/** Lecteur privé sans navigation vers l’hôte de stockage : seul un blob local est affiché. */
export function PdfPriveActions({ titre, nomFichier, chargerUrl, ouvrirLabel = "Relire le PDF", variant = "outline" }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [urlBlob, setUrlBlob] = useState("");
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [largeur, setLargeur] = useState(640);
  const blobRef = useRef<Blob | null>(null);
  const promesseRef = useRef<Promise<Blob> | null>(null);
  const chargeurRef = useRef(chargerUrl);
  const conteneurRef = useRef<HTMLDivElement>(null);
  chargeurRef.current = chargerUrl;

  const liberer = useCallback(() => {
    setUrlBlob(url => { if (url) URL.revokeObjectURL(url); return ""; });
    blobRef.current = null;
    promesseRef.current = null;
    setPages(0); setPage(1);
  }, []);

  useEffect(() => () => {
    if (urlBlob) URL.revokeObjectURL(urlBlob);
  }, [urlBlob]);

  useEffect(() => {
    if (!ouvert) return;
    const element = conteneurRef.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const valeur = Math.floor(entries[0]?.contentRect.width ?? 640);
      setLargeur(Math.max(240, Math.min(760, valeur - 4)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ouvert, urlBlob]);

  const charger = useCallback(() => {
    if (blobRef.current) return Promise.resolve(blobRef.current);
    if (promesseRef.current) return promesseRef.current;
    setChargement(true); setErreur("");
    const promesse = (async () => {
      const urlSignee = await chargeurRef.current();
      const blob = await pdfPriveDepuisUrlSignee(urlSignee);
      blobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setUrlBlob(url);
      return blob;
    })().catch(error => {
      promesseRef.current = null;
      setErreur(error instanceof Error ? error.message : "PDF privé indisponible");
      throw error;
    }).finally(() => setChargement(false));
    promesseRef.current = promesse;
    return promesse;
  }, []);

  const ouvrir = async () => {
    setOuvert(true);
    try { await charger(); } catch { /* le message reste dans la fenêtre */ }
  };

  const telecharger = async () => {
    try {
      const blob = await charger();
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url; lien.download = nomFichier.replace(/[^a-zA-Z0-9._-]/g, "-");
      document.body.appendChild(lien); lien.click(); lien.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch { /* message déjà affiché */ }
  };

  return <div className="flex min-w-0 max-w-full flex-wrap gap-2">
    <Button size="sm" variant={variant} disabled={chargement} onClick={ouvrir}>
      {chargement ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}{ouvrirLabel}
    </Button>
    <Button size="sm" variant="outline" disabled={chargement} onClick={telecharger}>
      <Download className="mr-2 h-4 w-4" />Télécharger
    </Button>
    {erreur && !ouvert && <p role="alert" className="w-full text-sm text-destructive">{erreur}</p>}
    <Dialog open={ouvert} onOpenChange={value => { setOuvert(value); if (!value) liberer(); }}>
      <DialogContent className="flex h-[92vh] w-[calc(100vw-1rem)] max-w-4xl flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-8">{titre}</DialogTitle>
          <DialogDescription>Lecture privée dans la plateforme. Aucun nouvel onglet vers le stockage n’est ouvert.</DialogDescription>
        </DialogHeader>
        {chargement && <p className="text-sm text-muted-foreground">Chargement sécurisé du PDF…</p>}
        {erreur && <p role="alert" className="text-sm text-destructive">{erreur} Utilisez « Télécharger » pour réessayer.</p>}
        <div ref={conteneurRef} className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/20 p-1">
          {urlBlob && <Document file={urlBlob} loading={<p className="p-4 text-sm">Lecture du document…</p>} onLoadSuccess={({ numPages }) => { setPages(numPages); setPage(1); }} onLoadError={() => setErreur("Le fichier privé a été reçu, mais son affichage PDF a échoué.")}>
            <Page pageNumber={page} width={largeur} renderAnnotationLayer={false} renderTextLayer={false} />
          </Document>}
        </div>
        {pages > 1 && <div className="flex items-center justify-center gap-3">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Précédent</Button>
          <span className="text-sm">Page {page} / {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Suivant</Button>
        </div>}
      </DialogContent>
    </Dialog>
  </div>;
}
