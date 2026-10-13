import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AccuseReceptionBadge, normalizeSujet, type AccuseReception } from "./AccuseReceptionBadge";
import { assainirHtmlEmail, documentIsole } from "@/lib/emailHtmlSafe";

interface EmailArchive {
  id: string;
  subject: string | null;
  body_html: string | null;
  body_preview: string | null;
  sender_email: string | null;
  sender_name: string | null;
  recipients: string[] | null;
  has_attachments: boolean | null;
  sent_at: string | null;
  created_at: string;
}

/** Copie archivée = même destinataire + même objet + envoi à ±30 min, la plus proche. Lecture seule. */
/** Plusieurs copies candidates = ambiguïté : aucune copie n'est montrée (jamais un choix arbitraire). */
export function choisirCopie(accuse: AccuseReception, copies: EmailArchive[]): EmailArchive | null | "ambigu" {
  const ts = new Date(accuse.sent_at).getTime();
  const dest = accuse.destinataire.trim().toLowerCase();
  const sujet = normalizeSujet(accuse.sujet);
  const candidats: EmailArchive[] = [];
  for (const c of copies) {
    if (!(c.recipients || []).some((r) => r.trim().toLowerCase() === dest)) continue;
    if (normalizeSujet(c.subject) !== sujet) continue;
    const d = Math.abs(new Date(c.sent_at || c.created_at).getTime() - ts);
    if (d <= 30 * 60 * 1000) candidats.push(c);
  }
  if (candidats.length > 1) return "ambigu";
  return candidats[0] ?? null;
}

const dt = (v: string | null | undefined) => (v ? format(new Date(v), "dd/MM/yyyy HH:mm", { locale: fr }) : "—");

export function EmailDetailDialog({ accuse, onClose }: { accuse: AccuseReception | null; onClose: () => void }) {
  const { user } = useAuth();
  const { data: result, isLoading, isError, error } = useQuery({
    queryKey: ["email-archive", user?.id, accuse?.id],
    enabled: !!accuse && !!user?.id,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const a = accuse!;
      const t = new Date(a.sent_at).getTime();
      const { data, error } = await supabase
        .from("emails")
        .select("id, subject, body_html, body_preview, sender_email, sender_name, recipients, has_attachments, sent_at, created_at")
        .eq("type", "sent")
        .gte("sent_at", new Date(t - 30 * 60000).toISOString())
        .lte("sent_at", new Date(t + 30 * 60000).toISOString())
        .limit(200)
        .abortSignal(signal);
      if (error) throw error;
      return choisirCopie(a, (data || []) as EmailArchive[]);
    },
  });
  const ambigu = result === "ambigu";
  const data = ambigu ? null : (result as EmailArchive | null | undefined);

  const rendu = useMemo(() => (data?.body_html ? assainirHtmlEmail(data.body_html) : null), [data?.body_html]);

  return (
    <Dialog open={!!accuse} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        {accuse && (
          <>
            <DialogHeader>
              <DialogTitle className="break-words text-left pr-6">{accuse.sujet || "(sans objet)"}</DialogTitle>
              <DialogDescription className="sr-only">Contenu du mail envoyé</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">De</dt>
              <dd className="break-all">{data ? `${data.sender_name || ""} ${data.sender_email ? `<${data.sender_email}>` : ""}`.trim() || "—" : "FTRANSPORT"}</dd>
              <dt className="text-muted-foreground">À</dt>
              <dd className="break-all">{(data?.recipients?.length ? data.recipients : [accuse.destinataire]).join(", ")}</dd>
              <dt className="text-muted-foreground">Envoyé le</dt>
              <dd>{dt(accuse.sent_at)}</dd>
              <dt className="text-muted-foreground">Statut</dt>
              <dd><AccuseReceptionBadge accuse={accuse} /></dd>
            </dl>
            <p className="text-xs text-muted-foreground">
              L'ouverture est un signal technique (parfois bloqué par la messagerie), pas une preuve de lecture. Consulter ce mail ici ne change aucun statut.
            </p>
            <div className="mt-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Chargement du contenu…</p>
              ) : isError ? (
                <p className="text-sm text-destructive py-6 text-center">
                  Lecture du contenu impossible ({error instanceof Error ? error.message : "erreur inconnue"}).
                </p>
              ) : ambigu ? (
                <p className="text-sm py-6 text-center border rounded-md bg-muted">Contenu non identifiable avec certitude : plusieurs mails identiques ont été envoyés à ce destinataire au même moment.</p>
              ) : !data || (!data.body_html && !data.body_preview) ? (
                <p className="text-sm py-6 text-center border rounded-md bg-muted">Contenu du mail non conservé.</p>
              ) : (
                <>
                  {rendu && rendu.imagesBloquees > 0 && (
                    <p className="text-xs text-muted-foreground mb-1">{rendu.imagesBloquees} image(s) distante(s) non chargée(s) par sécurité.</p>
                  )}
                  {rendu ? (
                    <iframe
                      title="Contenu du mail"
                      sandbox="allow-popups allow-popups-to-escape-sandbox"
                      referrerPolicy="no-referrer"
                      srcDoc={documentIsole(rendu.html)}
                      className="w-full h-[60vh] border rounded-md bg-background"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm border rounded-md p-3">{data.body_preview}</pre>
                  )}
                </>
              )}
              {data?.has_attachments && (
                <p className="text-sm mt-2 border rounded-md p-2 bg-muted">Pièce(s) jointe(s) envoyée(s) : fichiers non conservés dans l'historique.</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
