import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Landmark, ChevronRight, Inbox, Send, Eye, RefreshCw, Loader2, PenLine } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganisationForm } from "./OrganisationForm";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export function OrganisationsList() {
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [composing, setComposing] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const handleSendEmail = async () => {
    if (!selectedOrg?.email || !composeSubject.trim()) {
      toast.error("Veuillez renseigner un objet");
      return;
    }
    setSending(true);
    try {
      const htmlBody = composeBody.replace(/\n/g, '<br>');
      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'send',
          userEmail: 'contact@ftransport.fr',
          to: selectedOrg.email,
          subject: composeSubject,
          body: htmlBody,
        },
      });
      if (error) throw error;
      if (data?.success) {
        await supabase.from('emails').insert({
          subject: composeSubject,
          body_html: htmlBody,
          body_preview: composeBody.slice(0, 200),
          sender_email: 'contact@ftransport.fr',
          recipients: [selectedOrg.email],
          type: 'sent',
          is_read: true,
          sent_at: new Date().toISOString(),
        });
        toast.success('Email envoyé !');
        setComposing(false);
        setComposeSubject("");
        setComposeBody("");
        queryClient.invalidateQueries({ queryKey: ['org-emails'] });
      } else {
        throw new Error('Échec de l\'envoi');
      }
    } catch (err: any) {
      toast.error('Erreur : ' + (err.message || 'Échec'));
    } finally {
      setSending(false);
    }
  };

  const { data: organisations, isLoading } = useQuery({
    queryKey: ['organismes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organismes')
        .select('*')
        .order('nom', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all unread received emails to count per org
  const { data: allUnreadEmails } = useQuery({
    queryKey: ['org-unread-emails'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emails')
        .select('id, sender_email, is_read')
        .eq('is_read', false)
        .not('sender_email', 'is', null);
      if (error) throw error;
      return data || [];
    },
  });

  const getUnreadCount = (orgEmail: string | null) => {
    if (!orgEmail || !allUnreadEmails) return 0;
    const domain = orgEmail.split('@')[1]?.toLowerCase();
    if (!domain) return 0;
    return allUnreadEmails.filter(e => e.sender_email?.toLowerCase().includes(domain)).length;
  };

  // Fetch emails for the selected org
  const { data: orgEmails } = useQuery({
    queryKey: ['org-emails', selectedOrg?.email],
    queryFn: async () => {
      if (!selectedOrg?.email) return [];
      const emailDomain = selectedOrg.email.split('@')[1];
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).filter(e => {
        const matchSender = e.sender_email?.toLowerCase().includes(emailDomain.toLowerCase());
        const matchRecipient = e.recipients?.some((r: string) => r.toLowerCase().includes(emailDomain.toLowerCase()));
        return matchSender || matchRecipient;
      });
    },
    enabled: !!selectedOrg?.email,
  });

  // Mark unread emails as read when opening an org dialog
  useEffect(() => {
    if (!selectedOrg?.email || !orgEmails) return;
    const domain = selectedOrg.email.split('@')[1]?.toLowerCase();
    if (!domain) return;
    const unreadIds = orgEmails
      .filter(e => !e.is_read && e.sender_email?.toLowerCase().includes(domain))
      .map(e => e.id);
    if (unreadIds.length > 0) {
      supabase
        .from('emails')
        .update({ is_read: true })
        .in('id', unreadIds)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['org-unread-emails'] });
        });
    }
  }, [selectedOrg?.email, orgEmails, queryClient]);

  const sentEmails = (orgEmails?.filter(e => e.type === 'sent' || e.recipients?.some((r: string) => r.toLowerCase().includes(selectedOrg?.email?.split('@')[1]?.toLowerCase() || ''))) || [])
    .sort((a, b) => new Date(b.sent_at || b.created_at).getTime() - new Date(a.sent_at || a.created_at).getTime());
  const receivedEmails = (orgEmails?.filter(e => e.sender_email?.toLowerCase().includes(selectedOrg?.email?.split('@')[1]?.toLowerCase() || '')) || [])
    .sort((a, b) => new Date(b.received_at || b.created_at).getTime() - new Date(a.received_at || a.created_at).getTime());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organisations</h1>
          <p className="text-muted-foreground">Gérez vos organisations clientes et partenaires</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              try {
                const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
                  body: { action: 'sync-all', userEmail: 'contact@ftransport.fr' },
                });
                if (error) throw error;
                if (data?.success) {
                  toast.success(`Synchronisation terminée : ${data.synced} nouveau(x) email(s) (${data.inbox} reçus, ${data.sent} envoyés)`);
                  queryClient.invalidateQueries({ queryKey: ['org-emails'] });
                } else {
                  throw new Error('Échec de la synchronisation');
                }
              } catch (err: any) {
                console.error('Sync error:', err);
                toast.error('Erreur de synchronisation : ' + (err.message || 'Erreur inconnue'));
              } finally {
                setSyncing(false);
              }
            }}
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Synchroniser Outlook
          </Button>
          <OrganisationForm />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(organisations || []).map((org) => (
          <Card
            key={org.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedOrg(org)}
          >
            <CardContent className="p-5">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 bg-primary/10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {org.nom.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground">{org.nom}</h3>
                      {org.ville && <p className="text-sm text-muted-foreground">{org.ville}</p>}
                    </div>
                  </div>
                  <OrganisationForm organisation={org} />
                </div>

                <div className="space-y-2 text-sm">
                  {org.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{org.email}</span>
                    </div>
                  )}
                  {org.telephone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{org.telephone}</span>
                    </div>
                  )}
                  {org.adresse && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{org.adresse}{org.code_postal ? `, ${org.code_postal}` : ''}{org.ville ? ` ${org.ville}` : ''}</span>
                    </div>
                  )}
                  {org.siret && (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <span>SIRET: {org.siret}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>Voir les échanges</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                  {getUnreadCount(org.email) > 0 && (
                    <Badge variant="destructive" className="text-xs px-2 py-0.5 animate-pulse">
                      {getUnreadCount(org.email)} non lu{getUnreadCount(org.email) > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog détail organisation + emails */}
      <Dialog open={!!selectedOrg} onOpenChange={(open) => { if (!open) { setSelectedOrg(null); setSelectedEmail(null); } }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedOrg?.nom}
            </DialogTitle>
          </DialogHeader>

          {selectedOrg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedOrg.email && (
                  <div>
                    <span className="text-muted-foreground">Email :</span>{' '}
                    <span className="font-medium">{selectedOrg.email}</span>
                  </div>
                )}
                {selectedOrg.telephone && (
                  <div>
                    <span className="text-muted-foreground">Téléphone :</span>{' '}
                    <span className="font-medium">{selectedOrg.telephone}</span>
                  </div>
                )}
                {selectedOrg.adresse && (
                  <div>
                    <span className="text-muted-foreground">Adresse :</span>{' '}
                    <span className="font-medium">{selectedOrg.adresse}{selectedOrg.code_postal ? `, ${selectedOrg.code_postal}` : ''}{selectedOrg.ville ? ` ${selectedOrg.ville}` : ''}</span>
                  </div>
                )}
                {selectedOrg.siret && (
                  <div>
                    <span className="text-muted-foreground">SIRET :</span>{' '}
                    <span className="font-medium">{selectedOrg.siret}</span>
                  </div>
                )}
                {selectedOrg.numero_declaration && (
                  <div>
                    <span className="text-muted-foreground">N° Déclaration :</span>{' '}
                    <span className="font-medium">{selectedOrg.numero_declaration}</span>
                  </div>
                )}
                {selectedOrg.code_naf && (
                  <div>
                    <span className="text-muted-foreground">Code NAF :</span>{' '}
                    <span className="font-medium">{selectedOrg.code_naf}</span>
                  </div>
                )}
               </div>

              {/* Bouton écrire + formulaire */}
              {selectedOrg.email && (
                <div>
                  {!composing ? (
                    <Button onClick={() => setComposing(true)} className="gap-2" size="sm">
                      <PenLine className="h-4 w-4" />
                      Écrire un email
                    </Button>
                  ) : (
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <PenLine className="h-4 w-4" />
                          Nouveau message à {selectedOrg.email}
                        </h4>
                        <Button variant="ghost" size="sm" onClick={() => { setComposing(false); setComposeSubject(""); setComposeBody(""); }}>
                          Annuler
                        </Button>
                      </div>
                      <Input
                        placeholder="Objet du mail"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                      />
                      <Textarea
                        placeholder="Contenu du message..."
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
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
                        <Button onClick={handleSendEmail} disabled={sending || !composeSubject.trim()} className="gap-2">
                          <Send className="h-4 w-4" />
                          {sending ? 'Envoi...' : 'Envoyer'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Tabs defaultValue="received" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="sent" className="flex-1 gap-2">
                    <Send className="h-4 w-4" />
                    Envoyés ({sentEmails.length})
                  </TabsTrigger>
                  <TabsTrigger value="received" className="flex-1 gap-2">
                    <Inbox className="h-4 w-4" />
                    Reçus ({receivedEmails.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sent">
                  {sentEmails.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Aucun email envoyé à cette organisation</p>
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
                          {sentEmails.map(email => (
                            <TableRow key={email.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEmail(email)}>
                              <TableCell className="text-sm">
                                {email.sent_at ? format(new Date(email.sent_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                              </TableCell>
                              <TableCell className="font-medium text-sm">{email.subject}</TableCell>
                              <TableCell>
                                <Eye className="h-4 w-4 text-muted-foreground" />
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
                    <p className="text-sm text-muted-foreground text-center py-8">Aucun email reçu de cette organisation</p>
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
                          {receivedEmails.map(email => (
                            <TableRow key={email.id} className={`cursor-pointer hover:bg-muted/50 ${!email.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`} onClick={() => setSelectedEmail(email)}>
                              <TableCell className="text-sm">
                                {email.received_at ? format(new Date(email.received_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                              </TableCell>
                              <TableCell className={`text-sm ${!email.is_read ? 'font-bold' : 'font-medium'}`}>
                                {!email.is_read && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2 align-middle" />}
                                {email.subject}
                              </TableCell>
                              <TableCell className="text-sm">{email.sender_name || email.sender_email}</TableCell>
                              <TableCell>
                                <Eye className="h-4 w-4 text-muted-foreground" />
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
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog détail email */}
      <Dialog open={!!selectedEmail} onOpenChange={(open) => { if (!open) setSelectedEmail(null); }}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedEmail?.subject}</DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-3">
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><strong>De :</strong> {selectedEmail.sender_name || selectedEmail.sender_email || 'contact@ftransport.fr'}</p>
                <p><strong>À :</strong> {selectedEmail.recipients?.join(', ') || '-'}</p>
                <p><strong>Date :</strong> {selectedEmail.sent_at ? format(new Date(selectedEmail.sent_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr }) : selectedEmail.received_at ? format(new Date(selectedEmail.received_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr }) : '-'}</p>
              </div>
              {selectedEmail.body_html ? (
                <div className="border rounded-md p-4 bg-background" dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} />
              ) : (
                <p className="text-sm">{selectedEmail.body_preview || 'Aucun contenu'}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
