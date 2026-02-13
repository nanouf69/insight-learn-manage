import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Mail, Phone, MapPin, Landmark, ChevronRight, Inbox, Send, Eye } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganisationForm } from "./OrganisationForm";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const organisations = [
  {
    id: "cma",
    name: "Chambre des Métiers et de l'Artisanat",
    type: "institution",
    contact: "Mme Audrey CREVIER",
    email: "audrey.crevier@cma-auvergnerhonealpes.fr",
    phone: "",
    address: "Auvergne-Rhône-Alpes",
    apprenants: 0,
    formationsEnCours: 0,
    description: "Établissement public sous tutelle de l'État",
  },
  {
    id: "1",
    name: "Tech Solutions SARL",
    type: "client",
    contact: "Marc Dubois",
    email: "contact@techsolutions.fr",
    phone: "01 23 45 67 89",
    address: "15 Rue de l'Innovation, 75001 Paris",
    apprenants: 24,
    formationsEnCours: 3,
  },
  {
    id: "2",
    name: "Groupe Industriel ABC",
    type: "client",
    contact: "Claire Moreau",
    email: "rh@groupe-abc.com",
    phone: "01 98 76 54 32",
    address: "Zone Industrielle Nord, 69000 Lyon",
    apprenants: 45,
    formationsEnCours: 5,
  },
  {
    id: "3",
    name: "StartUp Digital",
    type: "prospect",
    contact: "Thomas Petit",
    email: "thomas@startup-digital.io",
    phone: "06 12 34 56 78",
    address: "10 Avenue des Startups, 33000 Bordeaux",
    apprenants: 0,
    formationsEnCours: 0,
  },
  {
    id: "4",
    name: "Cabinet Conseil RH",
    type: "partenaire",
    contact: "Sophie Lambert",
    email: "s.lambert@conseil-rh.fr",
    phone: "01 45 67 89 01",
    address: "25 Boulevard Haussmann, 75008 Paris",
    apprenants: 12,
    formationsEnCours: 2,
  },
  {
    id: "5",
    name: "Mairie de Marseille",
    type: "client",
    contact: "Jean-Pierre Martin",
    email: "formation@mairie-marseille.fr",
    phone: "04 91 00 00 00",
    address: "Hôtel de Ville, 13001 Marseille",
    apprenants: 67,
    formationsEnCours: 8,
  },
];

const getTypeBadge = (type: string) => {
  switch (type) {
    case "client":
      return <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Client</Badge>;
    case "prospect":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Prospect</Badge>;
    case "partenaire":
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Partenaire</Badge>;
    case "institution":
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Institution publique</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
};

export function OrganisationsList() {
  const [selectedOrg, setSelectedOrg] = useState<typeof organisations[0] | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);

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
      // Filter emails that involve this org's email or domain
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
        {organisations.map((org) => (
          <Card
            key={org.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedOrg(org)}
          >
            <CardContent className="p-5">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className={`h-12 w-12 ${org.type === 'institution' ? 'bg-emerald-100' : 'bg-primary/10'}`}>
                      <AvatarFallback className={`${org.type === 'institution' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary'} font-semibold`}>
                        {org.type === 'institution' ? <Landmark className="h-5 w-5" /> : org.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground">{org.name}</h3>
                      <p className="text-sm text-muted-foreground">{org.contact}</p>
                    </div>
                  </div>
                  {getTypeBadge(org.type)}
                </div>

                {'description' in org && org.description && (
                  <p className="text-xs text-muted-foreground italic">{org.description}</p>
                )}

                <div className="space-y-2 text-sm">
                  {org.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{org.email}</span>
                    </div>
                  )}
                  {org.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{org.phone}</span>
                    </div>
                  )}
                  {org.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{org.address}</span>
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
              {selectedOrg?.type === 'institution' && <Landmark className="h-5 w-5 text-emerald-600" />}
              {selectedOrg?.name}
              {selectedOrg && getTypeBadge(selectedOrg.type)}
            </DialogTitle>
          </DialogHeader>

          {selectedOrg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Contact :</span>{' '}
                  <span className="font-medium">{selectedOrg.contact}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email :</span>{' '}
                  <span className="font-medium">{selectedOrg.email}</span>
                </div>
                {selectedOrg.phone && (
                  <div>
                    <span className="text-muted-foreground">Téléphone :</span>{' '}
                    <span className="font-medium">{selectedOrg.phone}</span>
                  </div>
                )}
                {selectedOrg.address && (
                  <div>
                    <span className="text-muted-foreground">Adresse :</span>{' '}
                    <span className="font-medium">{selectedOrg.address}</span>
                  </div>
                )}
                {'description' in selectedOrg && selectedOrg.description && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Statut :</span>{' '}
                    <span className="font-medium">{selectedOrg.description}</span>
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
