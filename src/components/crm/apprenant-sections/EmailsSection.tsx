import { useState } from "react";
import { Mail, Send, Inbox, Clock, Plus, Search, RefreshCw, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface EmailsSectionProps {
  apprenant: any;
}

interface EmailRecord {
  id: string;
  outlook_message_id: string | null;
  subject: string;
  body_preview: string | null;
  body_html: string | null;
  sender_email: string | null;
  sender_name: string | null;
  recipients: string[] | null;
  type: 'sent' | 'received';
  is_read: boolean;
  has_attachments: boolean;
  received_at: string | null;
  sent_at: string | null;
  created_at: string;
}

// Email de l'organisme pour la synchronisation Outlook
const ORGANISME_EMAIL = "contact@ftransport.fr";
const ONBOARDING_URL = "https://insight-learn-manage.lovable.app/bienvenue";

function getFormationType(typeApprenant: string | null | undefined): string {
  const type = (typeApprenant || '').toLowerCase();
  if (type.includes('ta-e') || type === 'ta') return 'TAXI (mobilité VTC vers TAXI)';
  if (type.includes('va-e') || type === 'va') return 'VTC (mobilité TAXI vers VTC)';
  if (type.includes('taxi')) return 'TAXI';
  if (type.includes('vtc')) return 'VTC';
  return 'TAXI / VTC';
}

interface EmailTemplate {
  id: string;
  label: string;
  icon: string;
  getSubject: (apprenant: any) => string;
  getBody: (apprenant: any) => string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'bienvenue',
    label: '📄 Document de bienvenue',
    icon: '📄',
    getSubject: (a) => `Bienvenue chez Ftransport - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const formation = getFormationType(a.type_apprenant);
      return `Bonjour ${a.prenom} ${a.nom},

Nous avons le plaisir de vous confirmer votre inscription à la formation ${formation}.

⚠️ IMPORTANT : Afin de valider définitivement votre inscription à l'examen, merci de cliquer sur le lien ci-dessous et de suivre les étapes. Sans cela, vous ne serez pas inscrit à l'examen.

👉 CLIQUEZ ICI POUR VOUS INSCRIRE : ${ONBOARDING_URL}

Pour toute question, contactez-nous :
📞 Tél : 04 28 29 60 91
📧 Email : contact@ftransport.fr

Cordialement,
L'équipe Ftransport
86 Route de Genas, 69003 Lyon`;
    },
  },
  {
    id: 'rappel-documents',
    label: '📋 Rappel documents manquants',
    icon: '📋',
    getSubject: (a) => `Rappel : Documents manquants - ${a.prenom} ${a.nom}`,
    getBody: (a) => `Bonjour ${a.prenom},

Nous vous rappelons que certains documents nécessaires à la finalisation de votre dossier d'inscription sont encore manquants.

Merci de nous transmettre les pièces manquantes dans les plus brefs délais afin que nous puissions procéder à votre inscription à l'examen.

Vous pouvez compléter votre dossier en ligne : ${ONBOARDING_URL}

N'hésitez pas à nous contacter si vous avez des questions.

Cordialement,
L'équipe Ftransport
📞 04 28 29 60 91`,
  },
  {
    id: 'convocation-examen',
    label: '🎓 Convocation examen',
    icon: '🎓',
    getSubject: (a) => `Convocation à l'examen - ${a.prenom} ${a.nom}`,
    getBody: (a) => `Bonjour ${a.prenom},

Nous avons le plaisir de vous informer que votre inscription à l'examen a bien été validée.

📅 Date de l'examen : [À compléter]
📍 Lieu : [À compléter]
🕐 Heure de convocation : [À compléter]

Documents à apporter le jour de l'examen :
- Pièce d'identité en cours de validité
- Convocation (ce mail)

Nous vous souhaitons bonne chance !

Cordialement,
L'équipe Ftransport
📞 04 28 29 60 91`,
  },
  {
    id: 'confirmation-inscription',
    label: '✅ Confirmation d\'inscription',
    icon: '✅',
    getSubject: (a) => `Confirmation d'inscription - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const formation = getFormationType(a.type_apprenant);
      return `Bonjour ${a.prenom},

Nous vous confirmons que votre inscription à la formation ${formation} est bien enregistrée et votre dossier est complet.

Votre formation débutera prochainement. Nous vous transmettrons les informations pratiques (dates, horaires, lieu) par email.

En attendant, n'hésitez pas à nous contacter pour toute question.

Cordialement,
L'équipe Ftransport
📞 04 28 29 60 91
📧 contact@ftransport.fr`;
    },
  },
  {
    id: 'repassage-examen',
    label: '🔄 Repassage examen',
    icon: '🔄',
    getSubject: (a) => `Réinscription à l'examen T3P - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const formation = getFormationType(a.type_apprenant);
      return `Bonjour ${a.prenom},

Suite à votre précédent examen ${formation}, vous devez procéder à une nouvelle inscription pour repasser l'examen.

📌 ÉTAPES À SUIVRE :

1️⃣ Rendez-vous sur le site : www.exament3p.fr

2️⃣ Connectez-vous avec :
   • Login : votre adresse email
   • Mot de passe : cliquez sur "Mot de passe oublié" pour en créer un nouveau

3️⃣ Une fois connecté(e), procédez à votre réinscription à l'examen en suivant les instructions du site.

⚠️ IMPORTANT : Une fois votre réinscription effectuée sur le site, merci de nous recontacter immédiatement afin que nous puissions finaliser votre dossier et vous accompagner pour la suite.

📞 Tél : 04 28 29 60 91
📧 Email : contact@ftransport.fr

N'hésitez pas à nous contacter si vous rencontrez des difficultés lors de votre réinscription.

Cordialement,
L'équipe Ftransport
86 Route de Genas, 69003 Lyon`;
    },
  },
  {
    id: 'felicitations-vtc-pratique',
    label: '🎉 Félicitations VTC - Choix date pratique',
    icon: '🎉',
    getSubject: (a) => `Félicitations - Choix de votre date de formation pratique VTC - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const bookingUrl = `https://insight-learn-manage.lovable.app/reservation-pratique?id=${a.id}&type=vtc`;

      return `Bonjour ${a.prenom},<br><br>Félicitations, vous venez de réussir votre épreuve d'admissibilité, face à l'épreuve d'admission.<br><br>Vous devrez choisir une journée complète d'entraînement pratique (de 9h à 17h).<br><br>👉 <a href="${bookingUrl}">CHOISISSEZ VOTRE DATE ICI</a><br><br>⚠️ Attention : vous ne pouvez choisir qu'UNE SEULE date. Tout créneau choisi ne pourra pas être modifié.<br><br>📚 Merci de bien réviser le cours sur la pratique et d'effectuer les exercices.<br><br>Notamment les exercices suivants dans "Formation Pratique VTC" : Quizz Lyon et Questions à apprendre.<br>Ou cliquez sur le lien suivant : <a href="https://app.formative.com/join/DNFDZS">https://app.formative.com/join/DNFDZS</a><br><br>⚠️ Attention, si vous n'effectuez pas les exercices et que vous n'apprenez pas les éléments de la ville, vous risquez fortement d'échouer votre examen pratique.<br><br>🍽️ Vous aurez une pause à Confluences aux alentours de 12h jusqu'à 13h.<br><br>📍 RDV au 86 Route de Genas 69003 Lyon à la date que vous aurez choisie.<br><br>Cordialement,<br><br>FTRANSPORT<br>Centre de formation<br>86 Route de Genas 69003 Lyon<br>📞 04.28.29.60.91<br>De 9h à 17h sur rendez-vous`;
    },
  },
  {
    id: 'felicitations-taxi-pratique',
    label: '🎉 Félicitations TAXI - Choix date pratique',
    icon: '🎉',
    getSubject: (a) => `Félicitations - Choix de votre date de formation pratique TAXI - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const bookingUrl = `https://insight-learn-manage.lovable.app/reservation-pratique?id=${a.id}&type=taxi`;

      return `Bonjour ${a.prenom},<br><br>Félicitations, vous venez de réussir votre épreuve d'admissibilité, face à l'épreuve d'admission.<br><br>Vous devrez choisir une journée complète d'entraînement pratique (jusqu'à 17h au maximum).<br><br>👉 <a href="${bookingUrl}">CHOISISSEZ VOTRE DATE ICI</a><br><br>⚠️ Attention : vous ne pouvez choisir qu'UNE SEULE date. Tout créneau choisi ne pourra pas être modifié.<br><br>📚 Merci de bien réviser le cours sur la pratique et d'effectuer les exercices.<br><br>Notamment les exercices suivants dans "Formation Pratique TAXI" : QCM Taximètre, Cas pratique, Quizz Lyon et Questions à apprendre.<br>Ou cliquez ici : <a href="https://app.formative.com/join/ZT924H">https://app.formative.com/join/ZT924H</a><br><br>⚠️ Attention, si vous n'effectuez pas les exercices et que vous n'apprenez pas les éléments de la ville, vous risquez fortement d'échouer votre examen pratique.<br><br>🍽️ Vous aurez une pause à Confluences aux alentours de 12h jusqu'à 13h.<br><br>📍 RDV au 86 Route de Genas 69003 Lyon à la date que vous aurez choisie.<br><br>Cordialement,<br><br>FTRANSPORT<br>Centre de formation<br>86 Route de Genas 69003 Lyon<br>📞 04.28.29.60.91<br>De 9h à 17h sur rendez-vous`;
    },
  },
  {
    id: 'relance-paiement',
    label: '💰 Relance paiement',
    icon: '💰',
    getSubject: (a) => `Relance paiement - ${a.prenom} ${a.nom}`,
    getBody: (a) => `Bonjour ${a.prenom},

Nous vous contactons au sujet du règlement de votre formation. À ce jour, nous n'avons pas encore reçu votre paiement.

Merci de procéder au règlement dans les meilleurs délais ou de nous contacter pour convenir d'un échéancier.

Cordialement,
L'équipe Ftransport
📞 04 28 29 60 91
📧 contact@ftransport.fr`,
  },
  {
    id: 'confirmation-formation-continue',
    label: '📩 Confirmation formation continue',
    icon: '📩',
    getSubject: (a) => `Confirmation d'inscription formation continue - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const formation = getFormationType(a.type_apprenant);
      const dateDebut = a.date_debut_formation || '[date a completer]';
      const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

      return `${a.civilite || ''} ${a.prenom} ${a.nom}<br><br>${a.adresse || ''}<br>${a.code_postal || ''} ${a.ville || ''}<br><br><br><br><br>Lyon, le ${today}<br><br>Bonjour,<br><br>Nous avons le plaisir de vous convier pour la formation :<br><br><strong>${formation}</strong><br><br>Le <strong>${dateDebut}</strong><br><br>Horaires : de 9h a 12h et de 13h a 17h<br><br>Adresse : 86 route de Genas 69003 Lyon<br><br><br>A l'issue des quatorze heures de formation, une attestation de formation continue vous sera delivree et vous pourrez effectuer votre demande de renouvellement de carte professionnelle aupres de la prefecture.<br><br>Le reste des informations vous sera communique ce mardi.<br><br>Attention, si vous venez en voiture, merci de venir en avance, actuellement, il y a de nombreux travaux sur la route de Genas. Nous vous conseillons de vous garer sur l'avenue des Acacias a Lyon et de rejoindre le centre a pied.<br><br>Rappel, pour la formation vous devez :<br>- savoir lire et ecrire le francais<br>- avoir un permis de conduire plus de 3 ans en cours de validite<br>- avoir le casier judiciaire B2 vierge<br><br><span style="color: red; font-size: 18px; font-weight: bold;">⚠️ IMPORTANT : Nous vous rappelons que votre présence est obligatoire. En cas d'absence et/ou de retard, l'attestation de formation continue ne vous sera pas remise. Il est inutile de négocier ou de trouver des raisons : vous serez reporté(e) à la session suivante.</span><br><br>Pour les personnes qui n'ont pas réglé leur formation, merci de préparer l'appoint. Les chèques et la carte bleue ne seront pas acceptés le jour de l'entrée en formation. Pour les personnes qui souhaiteraient payer par virement, vous trouverez ci-joint le RIB du centre de formation.<br><br>Nous vous souhaitons une excellente formation et esperons qu'elle repondra pleinement a vos attentes.<br><br><strong>RIB - SASU SERVICES PRO F TRANSPORT</strong><br><br>IBAN : FR76 3000 4014 1800 0101 2475 357<br>BIC : BNPAFRPPXXX<br>Code banque : 30004<br>Code agence : 01418<br>N° de compte : 00010124753<br>Cle RIB : 57<br><br>SERVICES PRO 86 ROUTE DE GENAS 69003, LYON 3EME - FR`;
    },
  },
];

export function EmailsSection({ apprenant }: EmailsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received'>('all');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
  const [newEmailSubject, setNewEmailSubject] = useState("");
  const [newEmailBody, setNewEmailBody] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch emails from database
  const { data: emails = [], isLoading, refetch } = useQuery({
    queryKey: ['emails', apprenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('apprenant_id', apprenant.id)
        .order('received_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data || []) as EmailRecord[];
    },
    enabled: !!apprenant.id,
  });

  // Sync emails mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!apprenant.email) {
        throw new Error("L'apprenant n'a pas d'adresse email");
      }

      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'sync',
          apprenantId: apprenant.id,
          apprenantEmail: apprenant.email,
          userEmail: ORGANISME_EMAIL,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['emails', apprenant.id] });
      toast({
        title: "Synchronisation réussie",
        description: `${data.synced} email(s) synchronisé(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de synchronisation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send email mutation
  const sendMutation = useMutation({
    mutationFn: async ({ subject, body }: { subject: string; body: string }) => {
      if (!apprenant.email) {
        throw new Error("L'apprenant n'a pas d'adresse email");
      }

      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'send',
          apprenantId: apprenant.id,
          userEmail: ORGANISME_EMAIL,
          to: apprenant.email,
          subject,
          body,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', apprenant.id] });
      setIsComposeOpen(false);
      setNewEmailSubject("");
      setNewEmailBody("");
      setSelectedTemplate("");
      toast({
        title: "Email envoyé",
        description: `Email envoyé à ${apprenant.email}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur d'envoi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
        email.subject?.toLowerCase().includes(query) ||
        email.body_preview?.toLowerCase().includes(query)
      );
    });

  const sentCount = emails.filter(e => e.type === 'sent').length;
  const receivedCount = emails.filter(e => e.type === 'received').length;

  const handleSendEmail = () => {
    if (!newEmailSubject.trim() || !newEmailBody.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le sujet et le contenu de l'email",
        variant: "destructive",
      });
      return;
    }
    sendMutation.mutate({ subject: newEmailSubject, body: newEmailBody });
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setNewEmailSubject(template.getSubject(apprenant));
      setNewEmailBody(template.getBody(apprenant));
    }
  };

  const getEmailDate = (email: EmailRecord) => {
    const dateStr = email.type === 'sent' ? email.sent_at : email.received_at;
    return dateStr ? new Date(dateStr) : new Date(email.created_at);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Historique des Emails
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !apprenant.email}
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Synchroniser
          </Button>
          <Dialog open={isComposeOpen} onOpenChange={(open) => {
            setIsComposeOpen(open);
            if (!open) {
              setSelectedTemplate("");
              setNewEmailSubject("");
              setNewEmailBody("");
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!apprenant.email}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau mail
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouveau mail à {apprenant.prenom} {apprenant.nom}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Template selector */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" />
                    Modèle d'email
                  </Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un modèle d'email..." />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_TEMPLATES.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Destinataire</Label>
                  <Input value={apprenant.email || "Pas d'email"} disabled />
                </div>
                <div>
                  <Label>Sujet</Label>
                  <Input 
                    value={newEmailSubject} 
                    onChange={(e) => setNewEmailSubject(e.target.value)}
                    placeholder="Sujet de l'email..."
                  />
                </div>
                <div>
                  <Label>Message</Label>
                  {newEmailBody.includes('<br>') || newEmailBody.includes('<a ') ? (
                    <div 
                      className="border rounded-md p-3 min-h-[200px] max-h-[400px] overflow-y-auto text-sm bg-background"
                      dangerouslySetInnerHTML={{ __html: newEmailBody }}
                    />
                  ) : (
                    <Textarea 
                      value={newEmailBody} 
                      onChange={(e) => setNewEmailBody(e.target.value)}
                      placeholder="Contenu de l'email..."
                      rows={12}
                    />
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSendEmail} disabled={sendMutation.isPending}>
                    {sendMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Envoyer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun email trouvé</p>
                {apprenant.email && (
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => syncMutation.mutate()}
                  >
                    Synchroniser les emails depuis Outlook
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEmails.map((email) => (
                  <div 
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${
                      !email.is_read ? 'bg-primary/5 border-primary/20' : ''
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
                        <h4 className={`font-medium truncate ${!email.is_read ? 'font-semibold' : ''}`}>
                          {email.subject}
                        </h4>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {email.type === 'sent' ? 'Envoyé' : 'Reçu'}
                        </Badge>
                        {email.has_attachments && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            📎
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {email.body_preview}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="w-3 h-3" />
                      {format(getEmailDate(email), 'dd MMM yyyy', { locale: fr })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Info */}
        {!apprenant.email && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note :</strong> Ajoutez une adresse email à cet apprenant pour 
              pouvoir synchroniser et envoyer des emails.
            </p>
          </div>
        )}
      </CardContent>

      {/* Email detail dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          {selectedEmail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedEmail.type === 'sent' ? (
                    <Send className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Inbox className="w-5 h-5 text-green-600" />
                  )}
                  {selectedEmail.subject}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-3">
                  {selectedEmail.type === 'sent' ? (
                    <span><strong>À :</strong> {selectedEmail.recipients?.join(', ') || apprenant.email}</span>
                  ) : (
                    <span><strong>De :</strong> {selectedEmail.sender_name || selectedEmail.sender_email}</span>
                  )}
                  <span className="ml-auto">
                    {format(getEmailDate(selectedEmail), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </div>
                {selectedEmail.body_html ? (
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} 
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm font-sans">
                    {selectedEmail.body_preview}
                  </pre>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
