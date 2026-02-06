import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, FileText, BookOpen, Calendar, Mail, Phone, MapPin, CreditCard, Edit2, Download, CheckCircle2, XCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DocumentsFormation } from "./apprenant-sections/DocumentsFormation";
import { DocumentsDossier } from "./apprenant-sections/DocumentsDossier";
import { DocumentsInscription } from "./apprenant-sections/DocumentsInscription";
import { ExamensSection } from "./apprenant-sections/ExamensSection";
import { EmailsSection } from "./apprenant-sections/EmailsSection";

interface ApprenantDetailPageProps {
  apprenantId: string;
  onBack: () => void;
}

const typeLabels: Record<string, string> = {
  'vtc': 'VTC',
  'vtc-e': 'VTC E',
  'taxi': 'TAXI',
  'taxi-e': 'TAXI E',
  'ta': 'TA',
  'ta-e': 'TA E',
  'va-e': 'VA E',
};

const financementLabels: Record<string, string> = {
  'personnel': 'Personnel',
  'cpf': 'CPF',
  'cpf-a': 'CPF A',
  'opco': 'OPCO',
  'france-travail': 'France Travail',
  'entreprise': 'Entreprise',
};

export function ApprenantDetailPage({ apprenantId, onBack }: ApprenantDetailPageProps) {
  const [activeTab, setActiveTab] = useState("infos");

  const { data: apprenant, isLoading } = useQuery({
    queryKey: ['apprenant-detail', apprenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apprenants')
        .select('*')
        .eq('id', apprenantId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Récupérer la photo d'inscription du candidat
  const { data: photoDoc } = useQuery({
    queryKey: ['apprenant-photo', apprenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents_inscription')
        .select('url')
        .eq('apprenant_id', apprenantId)
        .eq('type_document', 'photo_identite')
        .eq('statut', 'valid')
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!apprenantId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!apprenant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Apprenant non trouvé</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  const initials = `${apprenant.prenom?.[0] || ''}${apprenant.nom?.[0] || ''}`.toUpperCase();
  const solde = (apprenant.montant_ttc || 0) - (apprenant.montant_paye || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="w-16 h-16">
            <AvatarImage 
              src={photoDoc?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${apprenant.prenom}${apprenant.nom}`} 
              className="object-cover"
            />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {apprenant.civilite} {apprenant.prenom} {apprenant.nom}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">
                {typeLabels[apprenant.type_apprenant || ''] || apprenant.type_apprenant || '-'}
              </Badge>
              <Badge variant="outline">
                {financementLabels[apprenant.mode_financement || ''] || apprenant.mode_financement || '-'}
              </Badge>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Edit2 className="w-4 h-4 mr-2" />
          Modifier
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="infos">Infos</TabsTrigger>
          <TabsTrigger value="docs-formation">Documents Formation</TabsTrigger>
          <TabsTrigger value="dossier">Dossier</TabsTrigger>
          <TabsTrigger value="docs-inscription">Inscription</TabsTrigger>
          <TabsTrigger value="examens">Examens</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
        </TabsList>

        {/* Infos Tab */}
        <TabsContent value="infos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informations personnelles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Civilité</p>
                    <p className="font-medium">{apprenant.civilite || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de naissance</p>
                    <p className="font-medium">
                      {apprenant.date_naissance 
                        ? format(new Date(apprenant.date_naissance), 'dd MMMM yyyy', { locale: fr })
                        : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{apprenant.email || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{apprenant.telephone || '-'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p>{apprenant.adresse || '-'}</p>
                    <p>{apprenant.code_postal} {apprenant.ville}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Formation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="w-5 h-5" />
                  Formation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Formation choisie</p>
                  <p className="font-medium">{apprenant.formation_choisie || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date de début</p>
                    <p className="font-medium">{apprenant.date_debut_formation || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de fin</p>
                    <p className="font-medium">{apprenant.date_fin_formation || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Créneau horaire</p>
                  <p className="font-medium">{apprenant.creneau_horaire || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">N° Dossier CMA</p>
                  <p className="font-medium">{apprenant.numero_dossier_cma || '-'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Financement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="w-5 h-5" />
                  Financement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Mode de financement</p>
                    <p className="font-medium">
                      {financementLabels[apprenant.mode_financement || ''] || apprenant.mode_financement || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Organisme financeur</p>
                    <p className="font-medium">{apprenant.organisme_financeur || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Montant TTC</p>
                    <p className="text-lg font-bold">{(apprenant.montant_ttc || 0).toLocaleString('fr-FR')}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payé</p>
                    <p className="text-lg font-bold text-green-600">{(apprenant.montant_paye || 0).toLocaleString('fr-FR')}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Solde</p>
                    <p className={`text-lg font-bold ${solde > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {solde.toLocaleString('fr-FR')}€
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Moyen de paiement</p>
                    <p className="font-medium">{apprenant.moyen_paiement || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de paiement</p>
                    <p className="font-medium">
                      {apprenant.date_paiement 
                        ? format(new Date(apprenant.date_paiement), 'dd MMMM yyyy', { locale: fr })
                        : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {apprenant.notes || 'Aucune note'}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Formation Tab */}
        <TabsContent value="docs-formation">
          <DocumentsFormation apprenant={apprenant} />
        </TabsContent>

        {/* Dossier Tab */}
        <TabsContent value="dossier">
          <DocumentsDossier apprenant={apprenant} />
        </TabsContent>

        {/* Documents Inscription Tab */}
        <TabsContent value="docs-inscription">
          <DocumentsInscription apprenant={apprenant} />
        </TabsContent>

        {/* Examens Tab */}
        <TabsContent value="examens">
          <ExamensSection apprenant={apprenant} />
        </TabsContent>

        {/* Emails Tab */}
        <TabsContent value="emails">
          <EmailsSection apprenant={apprenant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
