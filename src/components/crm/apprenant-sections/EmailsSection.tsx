import { useState } from "react";
import { Mail, Send, Inbox, Clock, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EmailsSectionProps {
  apprenant: any;
}

interface EmailRecord {
  id: string;
  subject: string;
  preview: string;
  date: Date;
  type: 'sent' | 'received';
  read: boolean;
}

export function EmailsSection({ apprenant }: EmailsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received'>('all');

  // TODO: Créer une table emails dans Supabase pour stocker l'historique
  // Pour l'instant, données simulées
  const [emails] = useState<EmailRecord[]>([
    {
      id: '1',
      subject: "Confirmation d'inscription à la formation VTC",
      preview: "Bonjour, nous avons bien reçu votre inscription...",
      date: new Date(2026, 0, 10),
      type: 'sent',
      read: true,
    },
    {
      id: '2',
      subject: "Documents à fournir pour votre dossier",
      preview: "Afin de compléter votre dossier d'inscription...",
      date: new Date(2026, 0, 11),
      type: 'sent',
      read: true,
    },
    {
      id: '3',
      subject: "Re: Documents à fournir pour votre dossier",
      preview: "Bonjour, veuillez trouver ci-joint les documents demandés...",
      date: new Date(2026, 0, 12),
      type: 'received',
      read: true,
    },
    {
      id: '4',
      subject: "Convocation examen théorique - 27 janvier 2026",
      preview: "Vous êtes convoqué(e) pour l'examen théorique...",
      date: new Date(2026, 0, 20),
      type: 'sent',
      read: true,
    },
  ]);

  const filteredEmails = emails
    .filter(email => {
      if (activeTab === 'sent') return email.type === 'sent';
      if (activeTab === 'received') return email.type === 'received';
      return true;
    })
    .filter(email => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        email.subject.toLowerCase().includes(query) ||
        email.preview.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const sentCount = emails.filter(e => e.type === 'sent').length;
  const receivedCount = emails.filter(e => e.type === 'received').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Historique des Emails
        </CardTitle>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau mail
        </Button>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{emails.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{sentCount}</p>
            <p className="text-xs text-muted-foreground">Envoyés</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{receivedCount}</p>
            <p className="text-xs text-muted-foreground">Reçus</p>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher dans les emails..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <Send className="w-3 h-3" />
              Envoyés
            </TabsTrigger>
            <TabsTrigger value="received" className="gap-2">
              <Inbox className="w-3 h-3" />
              Reçus
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredEmails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun email trouvé</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEmails.map((email) => (
                  <div 
                    key={email.id}
                    className={`flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${
                      !email.read ? 'bg-primary/5 border-primary/20' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      email.type === 'sent' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {email.type === 'sent' ? (
                        <Send className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Inbox className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium truncate ${!email.read ? 'font-semibold' : ''}`}>
                          {email.subject}
                        </h4>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {email.type === 'sent' ? 'Envoyé' : 'Reçu'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {email.preview}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="w-3 h-3" />
                      {format(email.date, 'dd MMM yyyy', { locale: fr })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Note */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Note :</strong> L'historique des emails sera synchronisé avec votre boîte mail 
            une fois l'intégration email configurée.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
