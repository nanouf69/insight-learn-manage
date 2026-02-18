import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Inbox, Eye, PenLine, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface EmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contactEmail: string;
  queryKey: string;
}

export function EmailDialog({ open, onOpenChange, contactName, contactEmail, queryKey }: EmailDialogProps) {
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: emails = [] } = useQuery({
    queryKey: [queryKey, contactEmail],
    queryFn: async () => {
      if (!contactEmail) return [];
      const emailDomain = contactEmail.split('@')[1];
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).filter(e => {
        const matchSender = e.sender_email?.toLowerCase().includes(emailDomain?.toLowerCase() || contactEmail.toLowerCase());
        const matchRecipient = e.recipients?.some((r: string) => r.toLowerCase().includes(contactEmail.toLowerCase()));
        const directMatch = e.sender_email?.toLowerCase() === contactEmail.toLowerCase() ||
          e.recipients?.some((r: string) => r.toLowerCase() === contactEmail.toLowerCase());
        return directMatch || matchSender || matchRecipient;
      });
    },
    enabled: open && !!contactEmail,
  });

  const sentEmails = emails
    .filter(e => e.type === 'sent')
    .sort((a: any, b: any) => new Date(b.sent_at || b.created_at).getTime() - new Date(a.sent_at || a.created_at).getTime());

  const receivedEmails = emails
    .filter(e => e.type === 'received')
    .sort((a: any, b: any) => new Date(b.received_at || b.created_at).getTime() - new Date(a.received_at || a.created_at).getTime());

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Veuillez renseigner un objet");
      return;
    }
    setSending(true);
    try {
      const htmlBody = body.replace(/\n/g, '<br>');
      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'send',
          userEmail: 'contact@ftransport.fr',
          to: contactEmail,
          subject,
          body: htmlBody,
        },
      });
      if (error) throw error;
      if (data?.success) {
        await supabase.from('emails').insert({
          subject,
          body_html: htmlBody,
          body_preview: body.slice(0, 200),
          sender_email: 'contact@ftransport.fr',
          recipients: [contactEmail],
          type: 'sent',
          is_read: true,
          sent_at: new Date().toISOString(),
        });
        toast.success('Email envoyé !');
        setComposing(false);
        setSubject("");
        setBody("");
        queryClient.invalidateQueries({ queryKey: [queryKey, contactEmail] });
      } else {
        throw new Error("Échec de l'envoi");
      }
    } catch (err: any) {
      toast.error('Erreur : ' + (err.message || 'Échec'));
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setComposing(false);
    setSubject("");
    setBody("");
    setSelectedEmail(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Emails — {contactName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{contactEmail}</p>

            {/* Compose */}
            {!composing ? (
              <Button onClick={() => setComposing(true)} size="sm" className="gap-2">
                <PenLine className="w-4 h-4" />
                Écrire un email
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <PenLine className="w-4 h-4" />
                    Nouveau message à {contactEmail}
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => { setComposing(false); setSubject(""); setBody(""); }}>
                    Annuler
                  </Button>
                </div>
                <Input
                  placeholder="Objet du mail"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <Textarea
                  placeholder="Contenu du message..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                />
                <div className="border-t border-dashed pt-3 mt-2 text-xs text-muted-foreground space-y-0.5">
                  <p className="font-semibold text-foreground">FTRANSPORT</p>
                  <p>Centre de formation VTC & TAXI</p>
                  <p>86 Route de Genas, 69003 Lyon</p>
                  <p>📞 04.28.29.60.91</p>
                  <p>📧 contact@ftransport.fr</p>
                  <p>🕐 Du lundi au vendredi, 9h - 18h</p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSend} disabled={sending || !subject.trim()} className="gap-2">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sending ? 'Envoi...' : 'Envoyer'}
                  </Button>
                </div>
              </div>
            )}

            {/* Historique */}
            <Tabs defaultValue="received">
              <TabsList className="w-full">
                <TabsTrigger value="sent" className="flex-1 gap-2">
                  <Send className="w-4 h-4" />
                  Envoyés ({sentEmails.length})
                </TabsTrigger>
                <TabsTrigger value="received" className="flex-1 gap-2">
                  <Inbox className="w-4 h-4" />
                  Reçus ({receivedEmails.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sent">
                {sentEmails.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucun email envoyé</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Objet</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sentEmails.map((email: any) => (
                          <TableRow key={email.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEmail(email)}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {email.sent_at ? format(new Date(email.sent_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                            </TableCell>
                            <TableCell className="font-medium text-sm">{email.subject}</TableCell>
                            <TableCell>
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="received">
                {receivedEmails.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucun email reçu</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Objet</TableHead>
                          <TableHead>Expéditeur</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receivedEmails.map((email: any) => (
                          <TableRow key={email.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEmail(email)}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {email.received_at ? format(new Date(email.received_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                            </TableCell>
                            <TableCell className="font-medium text-sm">{email.subject}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{email.sender_name || email.sender_email}</TableCell>
                            <TableCell>
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de lecture email */}
      <Dialog open={!!selectedEmail} onOpenChange={(o) => !o && setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedEmail?.subject}</DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground mb-4 space-y-1">
            <p>De : {selectedEmail?.sender_name ? `${selectedEmail.sender_name} <${selectedEmail.sender_email}>` : selectedEmail?.sender_email}</p>
            {selectedEmail?.recipients?.length > 0 && <p>À : {selectedEmail.recipients.join(', ')}</p>}
            <p>
              {selectedEmail?.sent_at
                ? format(new Date(selectedEmail.sent_at), 'dd MMMM yyyy à HH:mm', { locale: fr })
                : selectedEmail?.received_at
                  ? format(new Date(selectedEmail.received_at), 'dd MMMM yyyy à HH:mm', { locale: fr })
                  : ''}
            </p>
          </div>
          <div className="border rounded p-4 bg-background text-sm">
            {selectedEmail?.body_html
              ? <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} />
              : <p className="text-muted-foreground">{selectedEmail?.body_preview || 'Aucun contenu'}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
