import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Landmark, ChevronRight, Inbox, Send, Eye } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganisationForm } from "./OrganisationForm";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function OrganisationsList() {
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);

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

  const sentEmails = orgEmails?.filter(e => e.type === 'sent' || e.recipients?.some((r: string) => r.toLowerCase().includes(selectedOrg?.email?.split('@')[1]?.toLowerCase() || ''))) || [];
  const receivedEmails = orgEmails?.filter(e => e.sender_email?.toLowerCase().includes(selectedOrg?.email?.split('@')[1]?.toLowerCase() || '')) || [];

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
        <OrganisationForm />
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

              <Tabs defaultValue="sent" className="w-full">
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
                            <TableRow key={email.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEmail(email)}>
                              <TableCell className="text-sm">
                                {email.received_at ? format(new Date(email.received_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                              </TableCell>
                              <TableCell className="font-medium text-sm">{email.subject}</TableCell>
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
