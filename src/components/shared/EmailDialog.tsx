import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Inbox, Eye, PenLine, Loader2, Save, FileEdit, Trash2, Forward, Paperclip, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface AttachmentFile {
  file: File;
  name: string;
  contentType: string;
  contentBytes: string; // base64
}

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
  const [savingDraft, setSavingDraft] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [forwardTo, setForwardTo] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const draftEmails = emails
    .filter(e => e.type === 'draft')
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleSaveDraft = async () => {
    if (!subject.trim() && !body.trim()) {
      toast.error("Rien à sauvegarder");
      return;
    }
    setSavingDraft(true);
    try {
      const htmlBody = body.replace(/\n/g, '<br>');
      if (editingDraftId) {
        const { error } = await supabase.from('emails').update({
          subject: subject || '(Sans objet)',
          body_html: htmlBody,
          body_preview: body.slice(0, 200),
        }).eq('id', editingDraftId);
        if (error) throw error;
        toast.success('Brouillon mis à jour');
      } else {
        const { error } = await supabase.from('emails').insert({
          subject: subject || '(Sans objet)',
          body_html: htmlBody,
          body_preview: body.slice(0, 200),
          sender_email: 'contact@ftransport.fr',
          recipients: [contactEmail],
          type: 'draft',
          is_read: true,
        });
        if (error) throw error;
        toast.success('Brouillon enregistré');
      }
      setComposing(false);
      setSubject("");
      setBody("");
      setEditingDraftId(null);
      queryClient.invalidateQueries({ queryKey: [queryKey, contactEmail] });
    } catch (err: any) {
      toast.error('Erreur : ' + (err.message || 'Échec'));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleEditDraft = (draft: any) => {
    setSubject(draft.subject || '');
    setBody(draft.body_html?.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '') || draft.body_preview || '');
    setEditingDraftId(draft.id);
    setComposing(true);
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const { error } = await supabase.from('emails').delete().eq('id', draftId);
      if (error) throw error;
      toast.success('Brouillon supprimé');
      queryClient.invalidateQueries({ queryKey: [queryKey, contactEmail] });
    } catch (err: any) {
      toast.error('Erreur : ' + (err.message || 'Échec'));
    }
  };

  const handleSendDraft = async () => {
    await handleSend();
    if (editingDraftId) {
      await supabase.from('emails').delete().eq('id', editingDraftId);
      setEditingDraftId(null);
    }
  };

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
    setEditingDraftId(null);
    setIsForwarding(false);
    setForwardTo("");
    onOpenChange(false);
  };

  const handleForwardEmail = (email: any) => {
    const fwdSubject = email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`;
    const dateStr = email.sent_at || email.received_at || email.created_at;
    const formattedDate = dateStr ? format(new Date(dateStr), "dd MMMM yyyy 'à' HH:mm", { locale: fr }) : '';
    const originalHeader = `---------- Message transféré ----------\nDe : ${email.sender_name || email.sender_email || 'contact@ftransport.fr'}\nDate : ${formattedDate}\nObjet : ${email.subject}\nÀ : ${email.recipients?.join(', ') || contactEmail}\n\n`;
    const originalBody = email.body_html?.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '') || email.body_preview || '';
    setSubject(fwdSubject);
    setBody(originalHeader + originalBody);
    setIsForwarding(true);
    setForwardTo("");
    setSelectedEmail(null);
    setComposing(true);
  };

  const handleSendForward = async () => {
    if (!forwardTo.trim() || !subject.trim()) {
      toast.error("Veuillez renseigner le destinataire et l'objet");
      return;
    }
    setSending(true);
    try {
      const htmlBody = body.replace(/\n/g, '<br>');
      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'send',
          userEmail: 'contact@ftransport.fr',
          to: forwardTo.trim(),
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
          recipients: [forwardTo.trim()],
          type: 'sent',
          is_read: true,
          sent_at: new Date().toISOString(),
        });
        toast.success(`Email transféré à ${forwardTo}`);
        setComposing(false);
        setSubject("");
        setBody("");
        setIsForwarding(false);
        setForwardTo("");
        queryClient.invalidateQueries({ queryKey: [queryKey, contactEmail] });
      } else {
        throw new Error("Échec du transfert");
      }
    } catch (err: any) {
      toast.error('Erreur : ' + (err.message || 'Échec'));
    } finally {
      setSending(false);
    }
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
                    {isForwarding ? <Forward className="w-4 h-4" /> : <PenLine className="w-4 h-4" />}
                    {isForwarding ? 'Transférer un email' : `Nouveau message à ${contactEmail}`}
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => { setComposing(false); setSubject(""); setBody(""); setIsForwarding(false); setForwardTo(""); }}>
                    Annuler
                  </Button>
                </div>
                {isForwarding && (
                  <Input
                    placeholder="Email du destinataire..."
                    value={forwardTo}
                    onChange={(e) => setForwardTo(e.target.value)}
                    type="email"
                  />
                )}
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
                <div className="flex justify-end gap-2">
                  {!isForwarding && (
                    <Button variant="outline" onClick={handleSaveDraft} disabled={sending || savingDraft} className="gap-2">
                      {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {savingDraft ? 'Sauvegarde...' : editingDraftId ? 'Mettre à jour le brouillon' : 'Sauvegarder brouillon'}
                    </Button>
                  )}
                  <Button 
                    onClick={isForwarding ? handleSendForward : (editingDraftId ? handleSendDraft : handleSend)} 
                    disabled={sending || !subject.trim()} 
                    className="gap-2"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : isForwarding ? <Forward className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    {sending ? 'Envoi...' : isForwarding ? 'Transférer' : 'Envoyer'}
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
                {draftEmails.length > 0 && (
                  <TabsTrigger value="drafts" className="flex-1 gap-2">
                    <FileEdit className="w-4 h-4" />
                    Brouillons ({draftEmails.length})
                  </TabsTrigger>
                )}
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
                          <TableRow key={email.id} className={`cursor-pointer hover:bg-muted/50 ${!email.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`} onClick={() => setSelectedEmail(email)}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {email.received_at ? format(new Date(email.received_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                            </TableCell>
                            <TableCell className={`text-sm ${!email.is_read ? 'font-bold' : 'font-medium'}`}>
                              {!email.is_read && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2 align-middle" />}
                              {email.subject}
                            </TableCell>
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

              <TabsContent value="drafts">
                {draftEmails.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucun brouillon</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Objet</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {draftEmails.map((email: any) => (
                          <TableRow key={email.id}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {format(new Date(email.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </TableCell>
                            <TableCell className="font-medium text-sm">{email.subject}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditDraft(email)} title="Modifier">
                                  <PenLine className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteDraft(email.id)} title="Supprimer">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
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
          <div className="flex justify-end pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => selectedEmail && handleForwardEmail(selectedEmail)} className="gap-2">
              <Forward className="w-4 h-4" />
              Transférer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
