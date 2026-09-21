import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { envoyerEmail, loadTemplates } from "@/lib/prestataires/data";
import { renderEmail, textToHtml } from "@/lib/prestataires/templates";
import { TYPE_ENVOI_LABELS, type PrestataireDossier, type TypeEnvoi } from "@/lib/prestataires/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dossier: PrestataireDossier;
  typeEnvoi: TypeEnvoi;
  onSent: () => void;
}

export function EnvoiDialog({ open, onOpenChange, dossier, typeEnvoi, onSent }: Props) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [destinataire, setDestinataire] = useState(dossier.email ?? "");
  const [objet, setObjet] = useState("");
  const [corps, setCorps] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setErreur(null);
    setDestinataire(dossier.email ?? "");
    loadTemplates()
      .then((bundle) => {
        if (cancelled) return;
        const rendered = renderEmail(bundle.templates[typeEnvoi], bundle.signature, dossier, bundle.entreprise);
        setObjet(rendered.objet);
        setCorps(rendered.corps);
      })
      .catch(() => toast.error("Impossible de charger le modèle d'e-mail"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, typeEnvoi, dossier]);

  const handleSend = async () => {
    if (!destinataire.trim()) {
      toast.error("Adresse e-mail du prestataire manquante");
      return;
    }
    setSending(true);
    setErreur(null);
    try {
      const res = await envoyerEmail({
        dossier,
        typeEnvoi,
        objet,
        corpsTexte: corps,
        corpsHtml: textToHtml(corps),
        destinataire: destinataire.trim(),
      });
      if (res.success) {
        toast.success("E-mail envoyé — la preuve d'envoi est conservée dans l'historique");
        onSent();
        onOpenChange(false);
      } else {
        setErreur(res.error ?? "Échec de l'envoi");
        onSent();
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Échec de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{TYPE_ENVOI_LABELS[typeEnvoi]} — aperçu avant envoi</DialogTitle>
          <DialogDescription>
            Vous pouvez modifier le message. La version exacte réellement envoyée sera conservée dans l'historique.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {erreur && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Échec de l'envoi</AlertTitle>
                <AlertDescription>
                  {erreur} — le dossier et son historique sont conservés. Vous pouvez réessayer.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>Destinataire</Label>
              <Input value={destinataire} onChange={(e) => setDestinataire(e.target.value)} placeholder="email@prestataire.fr" />
            </div>
            <div className="space-y-2">
              <Label>Objet</Label>
              <Input value={objet} onChange={(e) => setObjet(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={corps} onChange={(e) => setCorps(e.target.value)} rows={18} className="font-mono text-xs" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending || loading} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {erreur ? "Réessayer l'envoi" : "Envoyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
