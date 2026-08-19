import { useState } from "react";
import { Eye, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  url: string;
  nom?: string;
}

/**
 * Bouton "Aperçu" : ouvre le support (PDF/PowerPoint converti) dans une fenêtre
 * afin de contrôler visuellement qu'il s'agit bien du bon document.
 */
export default function FilePreviewDialog({ url, nom }: Props) {
  const [open, setOpen] = useState(false);
  const isPdf = /\.pdf(\?|$)/i.test(url);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors text-[11px]"
        title="Aperçu du support"
      >
        <Eye className="w-3.5 h-3.5" />
        Aperçu
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-4">
          <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <DialogTitle className="text-base truncate">
              {nom || "Aperçu du support"}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 mr-8"
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="w-4 h-4" />
              Ouvrir
            </Button>
          </DialogHeader>

          <div className="flex-1 min-h-0 rounded-md border overflow-hidden bg-muted">
            {isPdf ? (
              <iframe
                src={url}
                title={nom || "Aperçu"}
                className="w-full h-full"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
                <p>Ce format ne peut pas être affiché directement dans le navigateur.</p>
                <Button onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
                  Télécharger / ouvrir le fichier
                </Button>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground break-all">{url}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
