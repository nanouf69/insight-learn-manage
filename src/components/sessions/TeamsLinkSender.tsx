import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send, Video, CheckCircle2, XCircle, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Recipient {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface TeamsLinkSenderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string;
  recipients: Recipient[];
}

const SUBJECT = "Votre lien de connexion – Session de formation";

const buildBody = (lien: string) => `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;line-height:1.6">
  <p>Bonjour,</p>
  <p>Votre session de formation en classe virtuelle débute bientôt. Voici votre lien de connexion Microsoft Teams :</p>
  <p><a href="${lien}" style="color:#1d4ed8;word-break:break-all">${lien}</a></p>
  <p>Pensez à télécharger l'application Teams si ce n'est pas déjà fait, et à vous connecter quelques minutes avant le début de la session.</p>
  <p>Nous vous rappelons que la présence à cette session est obligatoire.</p>
  <p>Cordialement,</p>
  <p><strong>FTRANSPORT - SERVICES PRO</strong></p>
</div>`.trim();

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

export function TeamsLinkSender({ open, onOpenChange, sessionId, recipients }: TeamsLinkSenderProps) {
  const queryClient = useQueryClient();
  const [lien, setLien] = useState("");
  const [search, setSearch] = useState("");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ recipient: Recipient; success: boolean; error?: string }[]>([]);

  const withEmail = useMemo(
    () => recipients.filter((r) => !!r.email),
    [recipients]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return withEmail;
    return withEmail.filter((r) =>
      `${r.prenom} ${r.nom} ${r.email}`.toLowerCase().includes(q)
    );
  }, [withEmail, search]);

  const selected = useMemo(
    () => withEmail.filter((r) => !excluded.has(r.id)),
    [withEmail, excluded]
  );

  const { data: historique = [] } = useQuery({
    queryKey: ["envois-lien-teams", sessionId],
    queryFn: async () => {
      const query = supabase
        .from("envois_lien_teams")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      const { data, error } = sessionId ? await query.eq("session_id", sessionId) : await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const linkValid = isValidUrl(lien);
  const canSend = linkValid && selected.length > 0 && !sending;

  const toggle = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!canSend) return;
    const cleanLink = lien.trim();
    const body = buildBody(cleanLink);
    setSending(true);
    setResults([]);
    const acc: { recipient: Recipient; success: boolean; error?: string }[] = [];

    for (const recipient of selected) {
      try {
        const { error } = await supabase.functions.invoke("sync-outlook-emails", {
          body: {
            action: "send",
            apprenantId: recipient.id,
            userEmail: "contact@ftransport.fr",
            to: recipient.email,
            subject: SUBJECT,
            body,
          },
        });
        if (error) throw error;
        acc.push({ recipient, success: true });
      } catch (err: any) {
        acc.push({ recipient, success: false, error: err?.message || "Échec d'envoi" });
      }
      setResults([...acc]);
    }

    const succes = acc.filter((r) => r.success).length;
    const echecs = acc.length - succes;

    try {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("envois_lien_teams").insert({
        session_id: sessionId ?? null,
        lien: cleanLink,
        destinataires: acc.map((r) => ({
          apprenant_id: r.recipient.id,
          nom: `${r.recipient.prenom} ${r.recipient.nom}`.trim(),
          email: r.recipient.email,
          statut: r.success ? "envoye" : "echec",
        })),
        nb_succes: succes,
        nb_echecs: echecs,
        created_by: userData?.user?.id ?? null,
      });
      await queryClient.invalidateQueries({ queryKey: ["envois-lien-teams", sessionId] });
    } catch (histErr) {
      console.warn("Historique d'envoi non enregistré:", histErr);
    }

    setSending(false);
    if (echecs === 0) {
      toast.success(`${succes} email(s) envoyé(s) avec succès`);
    } else {
      toast.warning(`${succes} envoyé(s), ${echecs} échec(s)`);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (sending) return;
    if (!nextOpen) {
      setResults([]);
      setSearch("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Envoyer le lien de connexion
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="teams-link">Lien Microsoft Teams de la session *</Label>
            <Input
              id="teams-link"
              value={lien}
              onChange={(e) => setLien(e.target.value)}
              placeholder="https://teams.microsoft.com/l/meetup-join/..."
              autoFocus
            />
            {lien.trim().length > 0 && !linkValid && (
              <p className="text-xs text-destructive">Merci de saisir une adresse valide commençant par https://</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Destinataires ({selected.length}/{withEmail.length})</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrer par nom ou email"
                className="h-8 max-w-[240px]"
              />
            </div>
            <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
              {filtered.map((r) => {
                const result = results.find((res) => res.recipient.id === r.id);
                return (
                  <label key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                    <Checkbox checked={!excluded.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                    <span className="font-medium">{r.prenom} {r.nom}</span>
                    <span className="text-xs text-muted-foreground truncate">{r.email}</span>
                    <span className="ml-auto">
                      {result?.success === true && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      {result?.success === false && <XCircle className="w-4 h-4 text-destructive" />}
                    </span>
                  </label>
                );
              })}
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-sm text-muted-foreground">Aucun destinataire avec une adresse email.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
            <p className="font-semibold">{SUBJECT}</p>
            <p className="text-muted-foreground text-xs">
              Le message contient le lien saisi, le rappel de télécharger Teams et le caractère obligatoire de la présence.
            </p>
          </div>

          {historique.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><History className="w-4 h-4" /> Historique des envois</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border divide-y text-xs">
                {historique.map((h: any) => (
                  <div key={h.id} className="px-3 py-2 space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">
                        {format(new Date(h.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                      </span>
                      <span className="text-muted-foreground">
                        {h.nb_succes} envoyé(s){h.nb_echecs > 0 ? ` · ${h.nb_echecs} échec(s)` : ""}
                      </span>
                    </div>
                    <p className="truncate text-muted-foreground">{h.lien}</p>
                    <p className="text-muted-foreground">
                      {(Array.isArray(h.destinataires) ? h.destinataires : [])
                        .map((d: any) => d?.nom || d?.email)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)} disabled={sending}>
              Fermer
            </Button>
            <Button onClick={handleSend} disabled={!canSend} className="gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "Envoi en cours..." : `Envoyer (${selected.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
