import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, FileText, BookOpen, Calendar, Mail, Phone, MapPin, CreditCard, Edit2, Download, CheckCircle2, XCircle, Plus, CalendarIcon, Pencil, KeyRound, Loader2, Copy, Monitor, Send } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MODULES_DATA, FORMATIONS, type FormationId } from "@/components/cours-en-ligne/formations-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { parseDateRange } from "@/lib/parseDateRange";
import { toast } from "sonner";
import { DocumentsFormation } from "./apprenant-sections/DocumentsFormation";
import { DocumentsDossier } from "./apprenant-sections/DocumentsDossier";
import { DocumentsInscription } from "./apprenant-sections/DocumentsInscription";
import { ExamensSection } from "./apprenant-sections/ExamensSection";
import { EmailsSection } from "./apprenant-sections/EmailsSection";
import { DevisSection } from "./apprenant-sections/DevisSection";
import { ApprenantEditForm } from "@/components/apprenants/ApprenantEditForm";
import { cn } from "@/lib/utils";
import { getAvatarUrl } from "@/lib/avatarUrl";

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

const formationLabels: Record<string, string> = {
  'vtc': 'Formation VTC (sans examen) - 1 099 €',
  'vtc-exam': 'Formation VTC avec frais d\'examen - 1 599 €',
  'taxi': 'Formation TAXI (sans examen) - 1 299 €',
  'taxi-exam': 'Formation TAXI avec frais d\'examen - 1 799 €',
  'passerelle-taxi': 'Formation TAXI pour chauffeur VTC (TA) - 999 €',
  'vtc-elearning-1099': 'Formation VTC (E-learning) - 1 099 €',
  'vtc-elearning': 'Formation VTC avec examen (E-learning) - 1 599 €',
  'taxi-elearning': 'Formation TAXI (E-learning) - 1 299 €',
  'passerelle-taxi-elearning': 'Formation TA (E-learning) - 999 €',
  'passerelle-vtc-elearning': 'Formation VA (E-learning) - 499 €',
  'vtc-e-presentiel': 'Formation VTC E-learning + Présentiel - 1 599 €',
  'taxi-e-presentiel': 'Formation TAXI E-learning + Présentiel - 1 799 €',
  'ta-e-presentiel': 'Formation TA E-learning + Présentiel - 999 €',
};

const creneauLabels: Record<string, string> = {
  'matin': 'Formation en matinée (8h - 12h)',
  'apres-midi': 'Formation en après-midi (13h - 17h)',
  'soiree': 'Formation en soirée (17h - 21h)',
  'journee': 'Formation en journée (8h - 17h)',
  'elearning': 'Formation en ligne',
  'repassage': 'Repassage',
  'pas-encore-choisi': 'Pas encore choisi',
};

export function ApprenantDetailPage({ apprenantId, onBack }: ApprenantDetailPageProps) {
  const [activeTab, setActiveTab] = useState("infos");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [dateDebutOpen, setDateDebutOpen] = useState(false);
  const [dateFinOpen, setDateFinOpen] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [resendingCredentials, setResendingCredentials] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [dateDebutCoursOpen, setDateDebutCoursOpen] = useState(false);
  const [dateFinCoursOpen, setDateFinCoursOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fonction pour mettre à jour une date
  const updateDate = async (field: 'date_debut_formation' | 'date_fin_formation', date: Date | undefined) => {
    if (!date) return;
    
    try {
      const { error } = await supabase
        .from('apprenants')
        .update({ [field]: format(date, 'yyyy-MM-dd') })
        .eq('id', apprenantId);

      if (error) throw error;

      toast.success("Date mise à jour");
      queryClient.invalidateQueries({ queryKey: ['apprenant-detail', apprenantId] });
      
      if (field === 'date_debut_formation') {
        setDateDebutOpen(false);
      } else {
        setDateFinOpen(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // Parser une date au format YYYY-MM-DD
  const parseDate = (dateStr: string | null | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    try {
      return parse(dateStr, 'yyyy-MM-dd', new Date());
    } catch {
      return undefined;
    }
  };
  const { data: apprenant, isLoading } = useQuery({
    queryKey: ['apprenant-detail', apprenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apprenants')
        .select('*')
        .eq('id', apprenantId)
        .single();
      
      if (error) throw error;
      
      // Si les dates ne sont pas définies mais date_formation_catalogue existe, les extraire
      if (data && data.date_formation_catalogue && (!data.date_debut_formation || !data.date_fin_formation)) {
        const { dateDebut, dateFin } = parseDateRange(data.date_formation_catalogue);
        
        // Mise à jour automatique en base si les dates ont été extraites
        if (dateDebut || dateFin) {
          const updates: Record<string, string> = {};
          if (dateDebut && !data.date_debut_formation) updates.date_debut_formation = dateDebut;
          if (dateFin && !data.date_fin_formation) updates.date_fin_formation = dateFin;
          
          if (Object.keys(updates).length > 0) {
            await supabase
              .from('apprenants')
              .update(updates)
              .eq('id', apprenantId);
            
            // Retourner les données avec les dates synchronisées
            return { 
              ...data, 
              date_debut_formation: data.date_debut_formation || dateDebut,
              date_fin_formation: data.date_fin_formation || dateFin
            };
          }
        }
      }
      
      return data;
    },
  });

  // Récupérer la photo d'inscription du candidat
  const { data: photoDoc } = useQuery({
    queryKey: ['apprenant-photo', apprenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents_inscription')
        .select('url, nom_fichier')
        .eq('apprenant_id', apprenantId)
        .eq('type_document', 'photo_identite')
        .in('statut', ['valid', 'recu'])
        .order('created_at', { ascending: false })
        .maybeSingle();
      
      if (error) {
        console.error('Erreur récupération photo:', error);
        return null;
      }
      
      if (!data?.url) return null;

      // Ignorer les PDFs - ce ne sont pas des images affichables
      const isPdf = data.nom_fichier?.toLowerCase().endsWith('.pdf') || data.url.toLowerCase().endsWith('.pdf');
      if (isPdf) return null;

      // Construire l'URL complète si c'est un chemin relatif
      let fullUrl = data.url;
      if (!fullUrl.startsWith('http')) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        fullUrl = `${supabaseUrl}/storage/v1/object/public/documents-inscription/${fullUrl}`;
      }
      
      return { url: fullUrl };
    },
    enabled: !!apprenantId,
    staleTime: 0,
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
              src={photoDoc?.url || getAvatarUrl(apprenant.prenom, apprenant.nom, apprenant.civilite)} 
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
        <div className="flex items-center gap-2">
          {/* Bouton créer compte apprenant */}
          {apprenant.email && !(apprenant as any).auth_user_id && !generatedPassword && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setCreatingAccount(true);
                try {
                  const { data, error } = await supabase.functions.invoke("create-apprenant-account", {
                    body: { apprenant_id: apprenantId, email: apprenant.email },
                  });
                  if (error) throw error;
                  if (data?.error) throw new Error(data.error);
                  setGeneratedPassword(data.password);
                  toast.success(`Compte créé ! Mot de passe : ${data.password}`);
                  queryClient.invalidateQueries({ queryKey: ['apprenant-detail', apprenantId] });
                } catch (err: any) {
                  toast.error(err.message || "Erreur lors de la création du compte");
                } finally {
                  setCreatingAccount(false);
                }
              }}
              disabled={creatingAccount}
            >
              {creatingAccount ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
              Créer compte cours
            </Button>
          )}
          {(generatedPassword || (apprenant as any).auth_user_id) && (
            <>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Compte actif
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setResendingCredentials(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("resend-credentials", {
                      body: { apprenant_id: apprenantId },
                    });
                    if (error) throw error;
                    if (data?.error) throw new Error(data.error);
                    setGeneratedPassword(data.password);
                    if (data.emailSent) {
                      toast.success(`Identifiants renvoyés à ${data.email} !`);
                    } else {
                      toast.warning(`Mot de passe réinitialisé mais l'email n'a pas pu être envoyé`);
                    }
                  } catch (err: any) {
                    toast.error(err.message || "Erreur lors du renvoi");
                  } finally {
                    setResendingCredentials(false);
                  }
                }}
                disabled={resendingCredentials}
              >
                {resendingCredentials ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Renvoyer identifiants
              </Button>
            </>
          )}
          {generatedPassword && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(generatedPassword);
                toast.success("Mot de passe copié !");
              }}
            >
              <Copy className="w-4 h-4 mr-1" />
              MDP: {generatedPassword}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Modal d'édition */}
      <ApprenantEditForm 
        apprenant={apprenant} 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
          <TabsTrigger value="infos">Infos</TabsTrigger>
          <TabsTrigger value="docs-formation">Documents Formation</TabsTrigger>
          <TabsTrigger value="dossier">Dossier</TabsTrigger>
          <TabsTrigger value="docs-inscription">Inscription</TabsTrigger>
          <TabsTrigger value="examens">Examens</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="devis">Devis</TabsTrigger>
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
                  <p className="font-medium">
                    {formationLabels[apprenant.formation_choisie || ''] || apprenant.formation_choisie || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dates de formation (catalogue)</p>
                  <p className="font-medium">{apprenant.date_formation_catalogue || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date de début</p>
                    <Popover open={dateDebutOpen} onOpenChange={setDateDebutOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-auto p-1 font-medium justify-start hover:bg-muted",
                            !apprenant.date_debut_formation && "text-muted-foreground"
                          )}
                        >
                          {apprenant.date_debut_formation 
                            ? format(parseDate(apprenant.date_debut_formation) || new Date(), 'dd MMMM yyyy', { locale: fr })
                            : 'Cliquer pour définir'}
                          <Pencil className="w-3 h-3 ml-2 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={parseDate(apprenant.date_debut_formation)}
                          onSelect={(date) => updateDate('date_debut_formation', date)}
                          initialFocus
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de fin</p>
                    <Popover open={dateFinOpen} onOpenChange={setDateFinOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-auto p-1 font-medium justify-start hover:bg-muted",
                            !apprenant.date_fin_formation && "text-muted-foreground"
                          )}
                        >
                          {apprenant.date_fin_formation 
                            ? format(parseDate(apprenant.date_fin_formation) || new Date(), 'dd MMMM yyyy', { locale: fr })
                            : 'Cliquer pour définir'}
                          <Pencil className="w-3 h-3 ml-2 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={parseDate(apprenant.date_fin_formation)}
                          onSelect={(date) => updateDate('date_fin_formation', date)}
                          initialFocus
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Créneau horaire</p>
                  <p className="font-medium">
                    {creneauLabels[apprenant.creneau_horaire || ''] || apprenant.creneau_horaire || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">N° Dossier CMA</p>
                  <p className="font-medium">{apprenant.numero_dossier_cma || '-'}</p>
                </div>
                
                {/* Informations d'examen */}
                <div className="pt-4 border-t space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Type d'examen</p>
                      <p className="font-medium">
                        {(apprenant as any).type_examen 
                          ? {
                              'vtc_complet': 'VTC examen complet',
                              'vtc_mobilite': 'VTC mobilité',
                              'taxi_complet': 'Taxi examen complet',
                              'taxi_mobilite': 'Taxi mobilité'
                            }[(apprenant as any).type_examen] || (apprenant as any).type_examen
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date d'examen théorique</p>
                      <p className="font-medium">{apprenant.date_examen_theorique || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lieu d'examen</p>
                    <p className="font-medium text-sm">{(apprenant as any).lieu_examen || '-'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">B2 vierge confirmé</p>
                    {(apprenant as any).b2_vierge === true ? (
                      <Badge className="bg-green-100 text-green-800">Oui</Badge>
                    ) : (apprenant as any).b2_vierge === false ? (
                      <Badge className="bg-red-100 text-red-800">Non</Badge>
                    ) : (
                      <Badge variant="outline">Non renseigné</Badge>
                    )}
                  </div>
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

            {/* Accès cours en ligne */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Monitor className="w-5 h-5" />
                  Accès cours en ligne
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date de début d'accès</p>
                    <Popover open={dateDebutCoursOpen} onOpenChange={setDateDebutCoursOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-auto p-1 font-medium justify-start hover:bg-muted",
                            !(apprenant as any).date_debut_cours_en_ligne && "text-muted-foreground"
                          )}
                        >
                          {(apprenant as any).date_debut_cours_en_ligne
                            ? format(parseDate((apprenant as any).date_debut_cours_en_ligne) || new Date(), 'dd MMMM yyyy', { locale: fr })
                            : 'Cliquer pour définir'}
                          <Pencil className="w-3 h-3 ml-2 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={parseDate((apprenant as any).date_debut_cours_en_ligne)}
                          onSelect={async (date) => {
                            if (!date) return;
                            try {
                              await supabase.from('apprenants').update({ date_debut_cours_en_ligne: format(date, 'yyyy-MM-dd') } as any).eq('id', apprenantId);
                              toast.success("Date de début d'accès mise à jour");
                              queryClient.invalidateQueries({ queryKey: ['apprenant-detail', apprenantId] });
                              setDateDebutCoursOpen(false);
                            } catch { toast.error("Erreur"); }
                          }}
                          initialFocus
                          locale={fr}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de fin d'accès</p>
                    <Popover open={dateFinCoursOpen} onOpenChange={setDateFinCoursOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-auto p-1 font-medium justify-start hover:bg-muted",
                            !(apprenant as any).date_fin_cours_en_ligne && "text-muted-foreground"
                          )}
                        >
                          {(apprenant as any).date_fin_cours_en_ligne
                            ? format(parseDate((apprenant as any).date_fin_cours_en_ligne) || new Date(), 'dd MMMM yyyy', { locale: fr })
                            : 'Cliquer pour définir'}
                          <Pencil className="w-3 h-3 ml-2 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={parseDate((apprenant as any).date_fin_cours_en_ligne)}
                          onSelect={async (date) => {
                            if (!date) return;
                            try {
                              await supabase.from('apprenants').update({ date_fin_cours_en_ligne: format(date, 'yyyy-MM-dd') } as any).eq('id', apprenantId);
                              toast.success("Date de fin d'accès mise à jour");
                              queryClient.invalidateQueries({ queryKey: ['apprenant-detail', apprenantId] });
                              setDateFinCoursOpen(false);
                            } catch { toast.error("Erreur"); }
                          }}
                          initialFocus
                          locale={fr}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Statut accès */}
                {(() => {
                  const now = new Date();
                  const debut = parseDate((apprenant as any).date_debut_cours_en_ligne);
                  const fin = parseDate((apprenant as any).date_fin_cours_en_ligne);
                  if (!debut || !fin) return (
                    <p className="text-sm text-muted-foreground italic">Définissez les deux dates pour activer l'accès aux cours en ligne.</p>
                  );
                  const isActive = now >= debut && now <= fin;
                  return (
                    <Badge className={isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {isActive ? "✅ Accès actif" : "🔒 Accès inactif"}
                    </Badge>
                  );
                })()}

                {/* Modules autorisés */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Modules autorisés</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {MODULES_DATA.map((mod) => {
                      const currentModules: number[] = (apprenant as any).modules_autorises || [];
                      const isChecked = currentModules.includes(mod.id);
                      return (
                        <label key={mod.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={async (checked) => {
                              const updated = checked
                                ? [...currentModules, mod.id]
                                : currentModules.filter((id: number) => id !== mod.id);
                              try {
                                await supabase.from('apprenants').update({ modules_autorises: updated } as any).eq('id', apprenantId);
                                queryClient.invalidateQueries({ queryKey: ['apprenant-detail', apprenantId] });
                              } catch { toast.error("Erreur"); }
                            }}
                          />
                          <span className="text-sm">{mod.nom}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
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

        {/* Devis Tab */}
        <TabsContent value="devis">
          <DevisSection apprenant={apprenant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
