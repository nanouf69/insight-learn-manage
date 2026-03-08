import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, User, FileText, BookOpen, Calendar, Mail, Phone, MapPin, CreditCard, Edit2, Download, CheckCircle2, XCircle, Plus, CalendarIcon, Pencil, KeyRound, Loader2, Copy, Monitor, Send, BarChart3, Trash2, AlertTriangle } from "lucide-react";
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
import { ResetCoursTab } from "./apprenant-sections/ResetCoursTab";
import { DocumentsCompletes } from "./apprenant-sections/DocumentsCompletes";
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
  'va': 'VA',
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

const DEFAULT_MODULES_BY_TYPE: Record<string, number[]> = {
  "vtc":               [1, 2, 3, 4, 35, 5, 8, 60, 50],
  "vtc-e-presentiel":  [1, 2, 3, 4, 35, 5, 8, 60, 50],
  "vtc-e":             [26, 2, 3, 4, 35, 5, 8, 60, 50],
  "taxi":              [1, 10, 7, 3, 9, 13, 11, 36, 6, 12, 61, 51],
  "taxi-e-presentiel": [1, 10, 7, 3, 9, 13, 11, 36, 6, 12, 61, 51],
  "taxi-e":            [26, 10, 7, 3, 9, 13, 11, 36, 6, 12, 61, 51],
  "ta":                [31, 40, 7, 3, 27, 28, 37, 6, 62, 52],
  "ta-e-presentiel":   [31, 40, 7, 3, 27, 28, 37, 6, 62, 52],
  "ta-e":              [32, 40, 7, 3, 27, 13, 28, 37, 6, 62, 52],
  "va":                [34, 41, 3, 29, 30, 38, 8, 63, 53],
  "va-e-presentiel":   [34, 41, 3, 29, 30, 38, 8, 63, 53],
  "va-e":              [34, 41, 3, 29, 30, 38, 8, 63, 53],
};

const COMPTE_FORMATIONS = [
  { id: "vtc", label: "VTC", types: ["vtc", "vtc-e"] },
  { id: "taxi", label: "TAXI", types: ["taxi", "taxi-e"] },
  { id: "ta", label: "TA", types: ["ta", "ta-e"] },
  { id: "va", label: "VA", types: ["va", "va-e"] },
];

const FORMATION_TO_TYPE: Record<string, string> = {
  "vtc": "vtc", "vtc-exam": "vtc",
  "taxi": "taxi", "taxi-exam": "taxi",
  "passerelle-taxi": "ta",
  "vtc-elearning-1099": "vtc-e", "vtc-elearning": "vtc-e",
  "taxi-elearning": "taxi-e",
  "passerelle-taxi-elearning": "ta-e",
  "passerelle-vtc-elearning": "va-e",
  "vtc-e-presentiel": "vtc-e-presentiel",
  "taxi-e-presentiel": "taxi-e-presentiel",
  "ta-e-presentiel": "ta-e-presentiel",
};

function normalizeTypeApprenant(type: string): string {
  if (!type) return "";
  const lower = type.toLowerCase().trim();
  if (lower.includes("taxi") && !lower.includes("vtc")) return lower.includes("elearning") || lower.includes("e-learning") ? "taxi-e" : "taxi";
  if (lower.includes("vtc")) {
    if (lower.includes("presentiel")) return "vtc-e-presentiel";
    return lower.includes("elearning") || lower.includes("e-learning") ? "vtc-e" : "vtc";
  }
  if (lower.includes("ta")) return lower.includes("elearning") || lower.includes("e-learning") ? "ta-e" : lower.includes("presentiel") ? "ta-e-presentiel" : "ta";
  if (lower.includes("va")) return "va-e";
  return lower;
}

export default function ApprenantDetailPage({ apprenantId, onBack }: ApprenantDetailPageProps) {
  const [activeTab, setActiveTab] = useState("infos");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedFormationForModules, setSelectedFormationForModules] = useState("");
  const [selectedFormationForAccount, setSelectedFormationForAccount] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [resendingCredentials, setResendingCredentials] = useState(false);
  const queryClient = useQueryClient();

  const { data: apprenant, isLoading } = useQuery({
    queryKey: ["apprenant-detail", apprenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apprenants")
        .select("*")
        .eq("id", apprenantId)
        .maybeSingle();

      if (error) {
        console.error("Erreur:", error);
        return null;
      }

      if (data && data.formation_choisie) {
        const dateStr = data.date_formation_catalogue;
        if (dateStr) {
          const range = parseDateRange(dateStr);
          if (range) {
            return {
              ...data,
              date_debut_formation: data.date_debut_formation || range.dateDebut,
              date_fin_formation: data.date_fin_formation || range.dateFin
            };
          }
        }
      }

      return data;
    },
  });

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

      const isPdf = data.nom_fichier?.toLowerCase().endsWith('.pdf') || data.url.toLowerCase().endsWith('.pdf');
      if (isPdf) return null;

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

  const rawModules = (apprenant as any)?.modules_autorises;
  const hasStoredModulesArray = Array.isArray(rawModules);
  const currentModules: number[] = hasStoredModulesArray
    ? rawModules.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id))
    : [];

  const primaryType = normalizeTypeApprenant((((apprenant as any)?.type_apprenant || "") as string).split(" + ")[0]);
  const formationKey = ((((apprenant as any)?.formation_choisie || "") as string).split(" + ")[0]);
  const fallbackTypeFromFormation = normalizeTypeApprenant(FORMATION_TO_TYPE[formationKey]);
  const resolvedTypeFromApprenant = primaryType || fallbackTypeFromFormation;
  const activeFormationType = selectedFormationForModules || resolvedTypeFromApprenant;

  const fallbackDefaultModules = DEFAULT_MODULES_BY_TYPE[resolvedTypeFromApprenant] || [];
  const effectiveModules = currentModules.length > 0 ? currentModules : fallbackDefaultModules;
  const fallbackSignature = fallbackDefaultModules.join(",");

  useEffect(() => {
    setSelectedFormationForModules("");
  }, [apprenantId]);

  useEffect(() => {
    if (!selectedFormationForModules && resolvedTypeFromApprenant) {
      setSelectedFormationForModules(resolvedTypeFromApprenant);
    }
  }, [resolvedTypeFromApprenant, selectedFormationForModules]);

  useEffect(() => {
    if (!apprenant?.id) return;
    if (hasStoredModulesArray) return;
    if (fallbackDefaultModules.length === 0) return;

    const autoFillModules = async () => {
      const { error } = await supabase
        .from("apprenants")
        .update({ modules_autorises: fallbackDefaultModules } as any)
        .eq("id", apprenantId);

      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["apprenant-detail", apprenantId] });
      }
    };

    void autoFillModules();
  }, [apprenant?.id, apprenantId, hasStoredModulesArray, fallbackSignature, queryClient]);

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
          {(apprenant as any).auth_user_id && (
            <>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Compte actif
              </Badge>
              <Button variant="outline" size="sm">
                <Send className="w-4 h-4 mr-2" />
                Renvoyer identifiants
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      {showEditDialog && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier l'apprenant</DialogTitle>
            </DialogHeader>
            {apprenant && (
              <ApprenantEditForm
                apprenant={apprenant}
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Tabs avec onglets en bas (sticky) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Onglets en haut */}
        <TabsList className="flex flex-wrap w-full gap-0 bg-transparent border-b border-border rounded-none p-0 h-auto justify-start [&>button]:rounded-none [&>button]:border-b-2 [&>button]:border-transparent [&>button]:data-[state=active]:border-primary">
          <TabsTrigger value="infos" className="text-sm">Infos</TabsTrigger>
          <TabsTrigger value="cours" className="text-sm">Attribuer les cours</TabsTrigger>
          <TabsTrigger value="resultats" className="text-sm">Résultats</TabsTrigger>
          <TabsTrigger value="docs-completes" className="text-sm">Formulaires</TabsTrigger>
          <TabsTrigger value="docs-formation" className="text-sm">Documents Formation</TabsTrigger>
          <TabsTrigger value="dossier" className="text-sm">Dossier</TabsTrigger>
          <TabsTrigger value="docs-inscription" className="text-sm">Inscription</TabsTrigger>
          <TabsTrigger value="examens" className="text-sm">Examens</TabsTrigger>
          <TabsTrigger value="emails" className="text-sm">Emails</TabsTrigger>
          <TabsTrigger value="devis" className="text-sm">Devis</TabsTrigger>
          <TabsTrigger value="reset-cours" className="text-sm text-destructive">Remise à zéro</TabsTrigger>
          <TabsTrigger value="delete-account" className="text-sm text-destructive">Supprimer</TabsTrigger>
        </TabsList>

        {/* Contenu principal des onglets */}
        <div className="space-y-4">
          {activeTab === "infos" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Informations personnelles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Civilité</p>
                      <p className="font-medium">{apprenant.civilite || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{apprenant.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Téléphone</p>
                      <p className="font-medium">{apprenant.telephone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Adresse</p>
                      <p className="font-medium">{apprenant.adresse || '-'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Formation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Formation choisie</p>
                      <p className="font-medium text-sm">{formationLabels[apprenant.formation_choisie || ''] || apprenant.formation_choisie || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Créneau horaire</p>
                      <p className="font-medium">{creneauLabels[apprenant.creneau_horaire || ''] || apprenant.creneau_horaire || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date de début</p>
                      <p className="font-medium">{apprenant.date_debut_formation || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date de fin</p>
                      <p className="font-medium">{apprenant.date_fin_formation || '-'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Attribuer les cours */}
          {activeTab === "cours" && (
            <CoursAttribution
              apprenant={apprenant}
              apprenantId={apprenantId}
              effectiveModules={effectiveModules}
              activeFormationType={activeFormationType}
              selectedFormationForModules={selectedFormationForModules}
              setSelectedFormationForModules={setSelectedFormationForModules}
              queryClient={queryClient}
            />
          )}

          {/* Résultats */}
          {activeTab === "resultats" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Résultats de l'apprenant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Consultez les résultats dans l'onglet "Cours en ligne" → "Rapport d'activité" pour un suivi détaillé des quiz et exercices complétés par cet apprenant.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Autres onglets */}
          {activeTab === "docs-completes" && <DocumentsCompletes apprenant={apprenant} />}
          {activeTab === "docs-formation" && <DocumentsFormation apprenant={apprenant} />}
          {activeTab === "dossier" && <DocumentsDossier apprenant={apprenant} />}
          {activeTab === "docs-inscription" && <DocumentsInscription apprenant={apprenant} />}
          {activeTab === "examens" && <ExamensSection apprenant={apprenant} />}
          {activeTab === "emails" && <EmailsSection apprenant={apprenant} />}
          {activeTab === "devis" && <DevisSection apprenant={apprenant} />}
          {activeTab === "reset-cours" && <ResetCoursTab apprenant={apprenant} queryClient={queryClient} />}
        </div>
      </Tabs>
    </div>
  );
}
