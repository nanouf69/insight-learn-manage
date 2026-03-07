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
  "va":                [34, 41, 7, 3, 29, 30, 38, 8, 63, 53],
  "va-e-presentiel":   [34, 41, 7, 3, 29, 30, 38, 8, 63, 53],
  "va-e":              [34, 41, 7, 3, 29, 30, 38, 8, 63, 53],
};

// Formations disponibles pour la création de compte cours
const COMPTE_FORMATIONS = [
  { id: "vtc", label: "Formation VTC", types: ["vtc", "vtc-e-presentiel"] },
  { id: "vtc-e", label: "Formation VTC E-learning", types: ["vtc-e"] },
  { id: "taxi", label: "Formation TAXI", types: ["taxi", "taxi-e-presentiel"] },
  { id: "taxi-e", label: "Formation TAXI E-learning", types: ["taxi-e"] },
  { id: "ta", label: "Formation TAXI pour chauffeur VTC (TA)", types: ["ta", "ta-e-presentiel"] },
  { id: "ta-e", label: "Formation TA E-learning", types: ["ta-e"] },
  { id: "va", label: "Formation VTC pour chauffeur TAXI (VA)", types: ["va", "va-e-presentiel", "va-e"] },
];

const FORMATION_TO_TYPE: Record<string, string> = {
  "vtc": "vtc",
  "vtc-exam": "vtc",
  "vtc-elearning-1099": "vtc-e",
  "vtc-elearning": "vtc-e",
  "taxi": "taxi",
  "taxi-exam": "taxi",
  "taxi-elearning": "taxi-e",
  "passerelle-taxi": "ta",
  "passerelle-taxi-elearning": "ta-e",
  "passerelle-vtc-elearning": "va-e",
  "vtc-e-presentiel": "vtc-e-presentiel",
  "taxi-e-presentiel": "taxi-e-presentiel",
  "ta-e-presentiel": "ta-e-presentiel",
};

const FORMATION_LABELS_BY_TYPE: Record<string, Record<number, string>> = {
  "vtc": {
    1: "1.INTRODUCTION PRÉSENTIEL",
    2: "2.COURS ET EXERCICES VTC",
    25: "2a.COURS ET EXERCICES VTC",
    14: "2b.COURS ET EXERCICES VTC",
    15: "2c.COURS ET EXERCICES VTC",
    16: "2d.COURS ET EXERCICES VTC",
    17: "2e.COURS ET EXERCICES VTC",
    18: "2f.COURS ET EXERCICES VTC",
    19: "2g.COURS ET EXERCICES VTC",
    3: "3.FORMULES",
    4: "4.BILAN EXERCICES VTC",
    35: "5.EXAMENS BLANCS VTC",
    5: "6.BILAN EXAMEN VTC",
    8: "7.PRATIQUE VTC",
  },
  "vtc-e": {
    26: "1.INTRODUCTION E-LEARNING",
    2: "2.COURS ET EXERCICES VTC",
    25: "2a.COURS ET EXERCICES VTC",
    14: "2b.COURS ET EXERCICES VTC",
    15: "2c.COURS ET EXERCICES VTC",
    16: "2d.COURS ET EXERCICES VTC",
    17: "2e.COURS ET EXERCICES VTC",
    18: "2f.COURS ET EXERCICES VTC",
    19: "2g.COURS ET EXERCICES VTC",
    3: "3.FORMULES",
    4: "4.BILAN EXERCICES VTC",
    35: "5.EXAMENS BLANCS VTC",
    5: "6.BILAN EXAMEN VTC",
    8: "7.PRATIQUE VTC",
  },
  "taxi": {
    1: "1.INTRODUCTION PRÉSENTIEL",
    10: "2.COURS ET EXERCICES TAXI",
    20: "2a.COURS ET EXERCICES TAXI",
    21: "2b.COURS ET EXERCICES TAXI",
    22: "2c.COURS ET EXERCICES TAXI",
    23: "2d.COURS ET EXERCICES TAXI",
    24: "2e.COURS ET EXERCICES TAXI",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    9: "5.BILAN EXERCICES TAXI",
    13: "6.CONTRÔLE DE CONNAISSANCES TAXI",
    11: "7.BILAN EXAMEN TAXI",
    36: "8.EXAMENS BLANCS TAXI",
    6: "9.PRATIQUE TAXI",
    12: "10.CAS PRATIQUE TAXI",
  },
  "taxi-e": {
    26: "1.INTRODUCTION E-LEARNING",
    10: "2.COURS ET EXERCICES TAXI",
    20: "2a.COURS ET EXERCICES TAXI",
    21: "2b.COURS ET EXERCICES TAXI",
    22: "2c.COURS ET EXERCICES TAXI",
    23: "2d.COURS ET EXERCICES TAXI",
    24: "2e.COURS ET EXERCICES TAXI",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    9: "5.BILAN EXERCICES TAXI",
    13: "6.CONTRÔLE DE CONNAISSANCES TAXI",
    11: "7.BILAN EXAMEN TAXI",
    36: "8.EXAMENS BLANCS TAXI",
    6: "9.PRATIQUE TAXI",
    12: "10.CAS PRATIQUE TAXI",
  },
  "ta": {
    31: "1.INTRODUCTION TA",
    40: "2.COURS ET EXERCICES TA",
    24: "2a.COURS ET EXERCICES TA",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    27: "5.BILAN EXERCICES TA",
    28: "6.BILAN EXAMEN TA",
    37: "7.EXAMENS BLANCS TA",
    6: "8.PRATIQUE TAXI",
  },
  "ta-e": {
    32: "1.INTRODUCTION TA E-LEARNING",
    40: "2.COURS ET EXERCICES TA",
    24: "2a.COURS ET EXERCICES TA",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    27: "5.BILAN EXERCICES TA",
    13: "6.CONTRÔLE DE CONNAISSANCES TAXI",
    28: "7.BILAN EXAMEN TA",
    37: "8.EXAMENS BLANCS TA",
    6: "9.PRATIQUE TAXI",
  },
  "va": {
    33: "1.INTRODUCTION VA",
    41: "2.COURS ET EXERCICES VA",
    18: "2a.COURS ET EXERCICES VA",
    19: "2b.COURS ET EXERCICES VA",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    29: "5.BILAN EXERCICES VA",
    30: "6.BILAN EXAMEN VA",
    38: "7.EXAMENS BLANCS VA",
    8: "8.PRATIQUE VTC",
  },
  "va-e": {
    34: "1.INTRODUCTION VA E-LEARNING",
    41: "2.COURS ET EXERCICES VA",
    18: "2a.COURS ET EXERCICES VA",
    19: "2b.COURS ET EXERCICES VA",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    29: "5.BILAN EXERCICES VA",
    30: "6.BILAN EXAMEN VA",
    38: "7.EXAMENS BLANCS VA",
    8: "8.PRATIQUE VTC",
  },
  "vtc-e-presentiel": {
    1: "1.INTRODUCTION PRÉSENTIEL",
    2: "2.COURS ET EXERCICES VTC",
    25: "2a.COURS ET EXERCICES VTC",
    14: "2b.COURS ET EXERCICES VTC",
    15: "2c.COURS ET EXERCICES VTC",
    16: "2d.COURS ET EXERCICES VTC",
    17: "2e.COURS ET EXERCICES VTC",
    18: "2f.COURS ET EXERCICES VTC",
    19: "2g.COURS ET EXERCICES VTC",
    3: "3.FORMULES",
    4: "4.BILAN EXERCICES VTC",
    35: "5.EXAMENS BLANCS VTC",
    5: "6.BILAN EXAMEN VTC",
    8: "7.PRATIQUE VTC",
  },
  "taxi-e-presentiel": {
    1: "1.INTRODUCTION PRÉSENTIEL",
    10: "2.COURS ET EXERCICES TAXI",
    20: "2a.COURS ET EXERCICES TAXI",
    21: "2b.COURS ET EXERCICES TAXI",
    22: "2c.COURS ET EXERCICES TAXI",
    23: "2d.COURS ET EXERCICES TAXI",
    24: "2e.COURS ET EXERCICES TAXI",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    9: "5.BILAN EXERCICES TAXI",
    13: "6.CONTRÔLE DE CONNAISSANCES TAXI",
    11: "7.BILAN EXAMEN TAXI",
    36: "8.EXAMENS BLANCS TAXI",
    6: "9.PRATIQUE TAXI",
    12: "10.CAS PRATIQUE TAXI",
  },
  "ta-e-presentiel": {
    31: "1.INTRODUCTION TA",
    40: "2.COURS ET EXERCICES TA",
    24: "2a.COURS ET EXERCICES TA",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    27: "5.BILAN EXERCICES TA",
    28: "6.BILAN EXAMEN TA",
    37: "7.EXAMENS BLANCS TA",
    6: "8.PRATIQUE TAXI",
  },
  "va-e-presentiel": {
    33: "1.INTRODUCTION VA",
    41: "2.COURS ET EXERCICES VA",
    18: "2a.COURS ET EXERCICES VA",
    19: "2b.COURS ET EXERCICES VA",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    29: "5.BILAN EXERCICES VA",
    30: "6.BILAN EXAMEN VA",
    38: "7.EXAMENS BLANCS VA",
    8: "8.PRATIQUE VTC",
  },
};

const normalizeTypeApprenant = (rawType: string | null | undefined): string => {
  if (!rawType) return "";

  const normalized = rawType.trim().toLowerCase();
  if (!normalized) return "";

  if (DEFAULT_MODULES_BY_TYPE[normalized]) return normalized;

  const dashed = normalized.replace(/\s+/g, "-");
  if (DEFAULT_MODULES_BY_TYPE[dashed]) return dashed;

  const aliases: Record<string, string> = {
    "vtc e": "vtc-e",
    "vtc e presentiel": "vtc-e-presentiel",
    "taxi e": "taxi-e",
    "taxi e presentiel": "taxi-e-presentiel",
    "ta e": "ta-e",
    "ta e presentiel": "ta-e-presentiel",
    "va e": "va-e",
    "va e presentiel": "va-e-presentiel",
  };

  return aliases[normalized] || aliases[dashed] || normalized;
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedFormationForAccount, setSelectedFormationForAccount] = useState<string>("");
  const [selectedFormationForModules, setSelectedFormationForModules] = useState<string>("");
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
          {/* Bouton créer compte apprenant */}
          {apprenant.email && !(apprenant as any).auth_user_id && !generatedPassword && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Auto-detect formation from type_apprenant
                const type = normalizeTypeApprenant((apprenant.type_apprenant || "").split(" + ")[0]);
                const matched = COMPTE_FORMATIONS.find(f => f.types.includes(type));
                setSelectedFormationForAccount(matched?.id || "");
                setShowCreateDialog(true);
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

      {/* Dialog de création de compte cours */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un compte cours en ligne</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium mb-2">Formation *</p>
              <Select value={selectedFormationForAccount} onValueChange={setSelectedFormationForAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une formation..." />
                </SelectTrigger>
                <SelectContent>
                  {COMPTE_FORMATIONS.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedFormationForAccount && (
              <div>
                <p className="text-sm font-medium mb-2">Modules qui seront attribués :</p>
                <div className="space-y-1 border rounded-md p-3 bg-muted/30">
                  {(DEFAULT_MODULES_BY_TYPE[selectedFormationForAccount] || []).map((modId) => {
                    const mod = MODULES_DATA.find((m) => m.id === modId);
                    const displayLabel = FORMATION_LABELS_BY_TYPE[selectedFormationForAccount]?.[modId]
                      || mod?.nom
                      || `Module ${modId}`;
                    return (
                      <div key={modId} className="flex items-center gap-2 text-sm py-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{displayLabel}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Vous pourrez ajouter des modules supplémentaires dans l'onglet « Attribuer les cours ».
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button
              disabled={!selectedFormationForAccount || creatingAccount}
              onClick={async () => {
                setCreatingAccount(true);
                try {
                  // Set modules for this formation
                  const modules = DEFAULT_MODULES_BY_TYPE[selectedFormationForAccount] || [];
                  await supabase.from('apprenants').update({ modules_autorises: modules } as any).eq('id', apprenantId);

                  // Create the auth account
                  const { data, error } = await supabase.functions.invoke("create-apprenant-account", {
                    body: { apprenant_id: apprenantId, email: apprenant.email },
                  });
                  if (error) throw error;
                  if (data?.error) throw new Error(data.error);
                  setGeneratedPassword(data.password);
                  toast.success(`Compte créé pour la formation « ${COMPTE_FORMATIONS.find(f => f.id === selectedFormationForAccount)?.label} » ! Mot de passe : ${data.password}`);
                  queryClient.invalidateQueries({ queryKey: ['apprenant-detail', apprenantId] });
                  setShowCreateDialog(false);
                } catch (err: any) {
                  toast.error(err.message || "Erreur lors de la création du compte");
                } finally {
                  setCreatingAccount(false);
                }
              }}
            >
              {creatingAccount ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
              Créer le compte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-11 lg:w-auto lg:inline-grid">
          <TabsTrigger value="infos">Infos</TabsTrigger>
          <TabsTrigger value="cours">Attribuer les cours</TabsTrigger>
          <TabsTrigger value="resultats">Résultats</TabsTrigger>
          <TabsTrigger value="docs-formation">Documents Formation</TabsTrigger>
          <TabsTrigger value="dossier">Dossier</TabsTrigger>
          <TabsTrigger value="docs-inscription">Inscription</TabsTrigger>
          <TabsTrigger value="examens">Examens</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="devis">Devis</TabsTrigger>
          <TabsTrigger value="reset-cours" className="text-destructive">Remise à zéro</TabsTrigger>
          <TabsTrigger value="delete-account" className="text-destructive">Supprimer compte</TabsTrigger>
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

          </div>
        </TabsContent>

        {/* Attribuer les cours Tab */}
        <TabsContent value="cours" className="space-y-6">
          <Card>
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

                {/* Menu déroulant pour choisir la formation */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    🎓 Choisir la formation à attribuer
                  </p>
                  <Select
                    value={activeFormationType || undefined}
                    onValueChange={async (formationId) => {
                      setSelectedFormationForModules(formationId);
                      const newModules = DEFAULT_MODULES_BY_TYPE[formationId] || [];
                      if (newModules.length === 0) return;
                      try {
                        const { error } = await supabase
                          .from('apprenants')
                          .update({ modules_autorises: newModules } as any)
                          .eq('id', apprenantId);

                        if (error) throw error;

                        queryClient.setQueryData(['apprenant-detail', apprenantId], (prev: any) => (
                          prev ? { ...prev, modules_autorises: newModules } : prev
                        ));
                        queryClient.invalidateQueries({ queryKey: ['apprenant-detail', apprenantId] });
                        toast.success("Modules mis à jour pour la formation sélectionnée");
                      } catch {
                        toast.error("Erreur lors de la mise à jour");
                      }
                    }}
                  >
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder="Sélectionner une formation..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vtc">VTC (Présentiel)</SelectItem>
                      <SelectItem value="vtc-e">VTC E-learning</SelectItem>
                      <SelectItem value="taxi">TAXI (Présentiel)</SelectItem>
                      <SelectItem value="taxi-e">TAXI E-learning</SelectItem>
                      <SelectItem value="ta">TA — Taxi pour VTC (Présentiel)</SelectItem>
                      <SelectItem value="ta-e">TA — Taxi pour VTC (E-learning)</SelectItem>
                      <SelectItem value="va">VA — VTC pour Taxi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(() => {
                  const resolvedType = activeFormationType;
                  const formationModuleIds = DEFAULT_MODULES_BY_TYPE[resolvedType] || [];
                  // Only show modules that exist in the managed modules list (no sub-matières)
                  const MANAGED_MODULE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40, 41, 50, 51, 52, 53, 60, 61, 62, 63];
                  const formationModules = formationModuleIds
                    .map(id => MODULES_DATA.find(m => m.id === id))
                    .filter((m): m is typeof MODULES_DATA[0] => !!m);
                  const otherModules = MODULES_DATA
                    .filter(m => !formationModuleIds.includes(m.id) && MANAGED_MODULE_IDS.includes(m.id));
                  const matchedFormation = COMPTE_FORMATIONS.find(f => f.types.includes(resolvedType));

                  const labelsForType = FORMATION_LABELS_BY_TYPE[resolvedType] || {};

                  const renderModuleCheckbox = (mod: typeof MODULES_DATA[0]) => {
                    const isChecked = effectiveModules.includes(mod.id);
                    const displayLabel = labelsForType[mod.id] || mod.nom;
                    return (
                      <label key={mod.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={async (checked) => {
                            const baseModules = effectiveModules;
                            const updated = checked
                              ? Array.from(new Set([...baseModules, mod.id]))
                              : baseModules.filter((id: number) => id !== mod.id);
                            try {
                              await supabase.from('apprenants').update({ modules_autorises: updated } as any).eq('id', apprenantId);
                              queryClient.invalidateQueries({ queryKey: ['apprenant-detail', apprenantId] });
                            } catch { toast.error("Erreur"); }
                          }}
                        />
                        <span className="text-sm">{displayLabel}</span>
                      </label>
                    );
                  };

                  return (
                    <div className="space-y-4">
                      {matchedFormation && formationModules.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">
                            📋 Modules {matchedFormation.label}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 border rounded-md p-3 bg-primary/5">
                            {formationModules.map(renderModuleCheckbox)}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                          ➕ Modules supplémentaires
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                          {(formationModules.length > 0 ? otherModules : MODULES_DATA).map(renderModuleCheckbox)}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
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

        {/* Remise à zéro Tab */}
        <TabsContent value="reset-cours">
          <ResetCoursTab apprenant={apprenant} queryClient={queryClient} />
        </TabsContent>

        {/* Supprimer compte cours Tab */}
        <TabsContent value="delete-account">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Supprimer le compte cours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!(apprenant as any).auth_user_id ? (
                <div className="text-center py-8 text-muted-foreground">
                  <XCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Aucun compte cours actif</p>
                  <p className="text-sm">Cet apprenant n'a pas de compte cours à supprimer.</p>
                </div>
              ) : (
                <>
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-destructive">⚠️ Action irréversible</p>
                    <p className="text-sm text-muted-foreground">
                      La suppression du compte cours va :
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Supprimer le compte de connexion de l'apprenant</li>
                      <li>Supprimer toutes les données de progression (connexions, activités, quiz)</li>
                      <li>Supprimer tous les résultats de modules et examens</li>
                      <li>L'apprenant ne pourra plus se connecter à la plateforme</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      La fiche apprenant et les documents seront conservés. Vous pourrez recréer un compte ultérieurement.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (!confirm(`Êtes-vous sûr de vouloir supprimer le compte cours de ${apprenant.prenom} ${apprenant.nom} ? Cette action est irréversible.`)) return;
                        try {
                          const { data, error } = await supabase.functions.invoke("delete-apprenant-account", {
                            body: { apprenant_id: apprenantId },
                          });
                          if (error) throw error;
                          if (data?.error) throw new Error(data.error);
                          toast.success(data.message || "Compte cours supprimé avec succès");
                          setGeneratedPassword("");
                          queryClient.invalidateQueries({ queryKey: ['apprenant-detail', apprenantId] });
                        } catch (err: any) {
                          toast.error(err.message || "Erreur lors de la suppression");
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer le compte cours
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
