import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, CheckCircle2, XCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Recipient {
  id: string;
  name: string;
  email: string;
}

interface BulkEmailSenderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: Recipient[];
  subject: string;
  getHtmlBody: (recipient: Recipient) => string;
  title: string;
  description?: string;
}

interface SendResult {
  recipient: Recipient;
  success: boolean;
  error?: string;
}

export function BulkEmailSender({
  open,
  onOpenChange,
  recipients,
  subject,
  getHtmlBody,
  title,
  description,
}: BulkEmailSenderProps) {
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[]>([]);
  const [done, setDone] = useState(false);

  const handleSendAll = async () => {
    setSending(true);
    setResults([]);
    const newResults: SendResult[] = [];

    for (const recipient of recipients) {
      const htmlBody = getHtmlBody(recipient);
      try {
        const { data, error } = await supabase.functions.invoke("sync-outlook-emails", {
          body: {
            action: "send",
            userEmail: "contact@ftransport.fr",
            to: recipient.email,
            subject,
            body: htmlBody,
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error("Échec envoi");

        // Tracer en base
        await supabase.from("emails").insert({
          subject,
          body_html: htmlBody,
          body_preview: subject,
          sender_email: "contact@ftransport.fr",
          sender_name: "FTRANSPORT",
          recipients: [recipient.email],
          type: "sent",
          is_read: true,
          sent_at: new Date().toISOString(),
        });

        newResults.push({ recipient, success: true });
      } catch (err: any) {
        newResults.push({ recipient, success: false, error: err.message });
      }

      // UI update progressif
      setResults([...newResults]);
    }

    setSending(false);
    setDone(true);
    const successCount = newResults.filter((r) => r.success).length;
    toast.success(`${successCount}/${recipients.length} email(s) envoyé(s) avec succès`);
  };

  const handleClose = () => {
    if (!sending) {
      setResults([]);
      setDone(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}

          {/* Aperçu objet */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Objet</p>
            <p className="text-sm font-semibold">{subject}</p>
          </div>

          {/* Liste des destinataires */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Destinataires ({recipients.length})
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {recipients.map((r) => {
                const result = results.find((res) => res.recipient.id === r.id);
                return (
                  <div key={r.id} className="flex items-center justify-between text-sm rounded-md px-3 py-2 bg-background border">
                    <div>
                      <span className="font-medium">{r.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{r.email}</span>
                    </div>
                    {result ? (
                      result.success ? (

                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                        <XCircle className="w-4 h-4 text-destructive shrink-0" aria-label={result.error} />
                      )
                    ) : sending ? (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Résultat final */}
          {done && (
            <div className="rounded-lg border bg-accent/30 border-border p-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Envoi terminé — {results.filter((r) => r.success).length}/{recipients.length} réussi(s)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Envoyé le {format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })} · Tracé dans l'historique emails
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={sending}>
              {done ? "Fermer" : "Annuler"}
            </Button>
            {!done && (
              <Button onClick={handleSendAll} disabled={sending} className="gap-2">
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {sending ? "Envoi en cours..." : `Envoyer à ${recipients.length} destinataire(s)`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
