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
import { Input } from "@/components/ui/input";
import { getAvatarUrl } from "@/lib/avatarUrl";

import { ALL_MODULES, FORMATION_MODULES, MANAGED_MODULE_IDS, DEFAULT_MODULES_BY_TYPE } from "@/components/cours-en-ligne/modules-config";

// Derive ordered formation modules from shared config
const ORDERED_FORMATION_MODULES = Object.fromEntries(
  Object.entries(FORMATION_MODULES).map(([k, v]) => [k, v.modules])
);

function CoursAttribution({ apprenant, apprenantId, effectiveModules, activeFormationType, selectedFormationForModules, setSelectedFormationForModules, queryClient }: any) {
  const [localModules, setLocalModules] = useState<number[]>(effectiveModules);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalModules(effectiveModules);
  }, [effectiveModules.join(",")]);

  const toggleModule = (id: number) => {
    setLocalModules((prev: number[]) =>
      prev.includes(id) ? prev.filter((m: number) => m !== id) : [...prev, id]
    );
  };

  const saveModules = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("apprenants")
      .update({ modules_autorises: localModules } as any)
      .eq("id", apprenantId);
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Modules sauvegardés");
      queryClient.invalidateQueries({ queryKey: ["apprenant-detail", apprenantId] });
    }
  };

  const applyPreset = (type: string) => {
    const preset = DEFAULT_MODULES_BY_TYPE[type];
    if (preset) {
      setLocalModules(preset);
      setSelectedFormationForModules(type);
    }
  };

  const hasChanges = JSON.stringify([...localModules].sort()) !== JSON.stringify([...effectiveModules].sort());

  // Get ordered formation modules for the selected formation
  const formationModules = selectedFormationForModules ? ORDERED_FORMATION_MODULES[selectedFormationForModules] || [] : [];
  const formationModuleIds = new Set(formationModules.map(m => m.id));

  // Extra modules = managed modules NOT in the formation
  const extraModules = MODULES_DATA.filter(m => MANAGED_MODULE_IDS.has(m.id) && !formationModuleIds.has(m.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Attribuer les cours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Attribution rapide :</span>
          <Select value={selectedFormationForModules || ""} onValueChange={(val) => applyPreset(val)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Choisir une formation" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(DEFAULT_MODULES_BY_TYPE).map((type) => (
                <SelectItem key={type} value={type}>
                  {type.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Formation modules — ordered as in Formations tab */}
        {selectedFormationForModules && formationModules.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Modules de la formation</p>
            <div className="border rounded-md p-3 space-y-1 bg-muted/30">
              {formationModules.map((mod) => (
                <label key={mod.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                  <Checkbox
                    checked={localModules.includes(mod.id)}
                    onCheckedChange={() => toggleModule(mod.id)}
                  />
                  <span className={cn("font-medium", !localModules.includes(mod.id) && "text-muted-foreground")}>
                    {mod.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Extra modules */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Modules supplémentaires à ajouter</p>
          <div className="max-h-[250px] overflow-y-auto border rounded-md p-3 space-y-1">
            {extraModules.map((mod) => (
              <label key={mod.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                <Checkbox
                  checked={localModules.includes(mod.id)}
                  onCheckedChange={() => toggleModule(mod.id)}
                />
                <span className={cn(!localModules.includes(mod.id) && "text-muted-foreground")}>
                  {mod.nom}
                </span>
              </label>
            ))}
          </div>
        </div>

        {hasChanges && (
          <Button onClick={saveModules} disabled={saving}>
            {saving ? "Sauvegarde..." : "Sauvegarder les modules"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}



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

const COMPTE_FORMATIONS = [
  { id: "vtc", label: "VTC (Présentiel)" },
  { id: "vtc-e", label: "VTC E-learning" },
  { id: "taxi", label: "TAXI (Présentiel)" },
  { id: "taxi-e", label: "TAXI E-learning" },
  { id: "ta", label: "TA (Présentiel)" },
  { id: "ta-e", label: "TA E-learning" },
  { id: "va", label: "VA (Présentiel)" },
  { id: "va-e", label: "VA E-learning" },
] as const;

const ACCOUNT_FORMATION_TO_TYPE: Record<string, string> = {
  vtc: "vtc",
  "vtc-e": "vtc-e",
  taxi: "taxi",
  "taxi-e": "taxi-e",
  ta: "ta",
  "ta-e": "ta-e",
  va: "va",
  "va-e": "va-e",
};

const ACCOUNT_FORMATION_TO_DB_FORMATION: Record<string, string> = {
  vtc: "vtc",
  "vtc-e": "vtc-elearning",
  taxi: "taxi",
  "taxi-e": "taxi-elearning",
  ta: "passerelle-taxi",
  "ta-e": "passerelle-taxi-elearning",
  va: "passerelle-vtc-elearning",
  "va-e": "passerelle-vtc-elearning",
};

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

export default function ApprenantDetailPage({ apprenantId, onBack }: ApprenantDetailPageProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("infos");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedFormationForModules, setSelectedFormationForModules] = useState("");
  const [selectedFormationForAccount, setSelectedFormationForAccount] = useState("");
  const [accountStartDate, setAccountStartDate] = useState("");
  const [accountEndDate, setAccountEndDate] = useState("");
  const [accountExtraModules, setAccountExtraModules] = useState<number[]>([]);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [resendingCredentials, setResendingCredentials] = useState(false);

  const normalizeTypeApprenant = (val: string | undefined | null): string => {
    if (!val) return "";
    return val.toLowerCase().trim();
  };

  const { data: apprenant, isLoading, error: fetchError } = useQuery({
    queryKey: ["apprenant-detail", apprenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apprenants")
        .select("*")
        .eq("id", apprenantId)
        .maybeSingle();

      if (error) throw error;
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

  const inferredAccountFormationId = useMemo(() => {
    if (resolvedTypeFromApprenant.startsWith("taxi")) return "taxi";
    if (resolvedTypeFromApprenant.startsWith("ta")) return "ta";
    if (resolvedTypeFromApprenant.startsWith("va")) return "va";
    return "vtc";
  }, [resolvedTypeFromApprenant]);

  const accountBaseModules = useMemo(() => {
    const selected = selectedFormationForAccount || inferredAccountFormationId;
    return DEFAULT_MODULES_BY_TYPE[selected] || [] as number[];
  }, [inferredAccountFormationId, selectedFormationForAccount]);

  const accountAdditionalModuleChoices = useMemo(
    () => MODULES_DATA.filter((m) => MANAGED_MODULE_IDS.has(m.id) && !accountBaseModules.includes(m.id)),
    [accountBaseModules]
  );

  const toggleAccountExtraModule = (id: number) => {
    setAccountExtraModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    setSelectedFormationForModules("");
  }, [apprenantId]);

  useEffect(() => {
    if (!selectedFormationForModules && resolvedTypeFromApprenant) {
      setSelectedFormationForModules(resolvedTypeFromApprenant);
    }
  }, [resolvedTypeFromApprenant, selectedFormationForModules]);

  useEffect(() => {
    if (!showCreateDialog) return;
    setSelectedFormationForAccount(inferredAccountFormationId);
    setAccountStartDate(((apprenant as any)?.date_debut_cours_en_ligne as string) || "");
    setAccountEndDate(((apprenant as any)?.date_fin_cours_en_ligne as string) || "");
    setAccountExtraModules([]);
    setGeneratedPassword("");
  }, [apprenant, inferredAccountFormationId, showCreateDialog]);

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
  const hasExistingAccount = Boolean((apprenant as any).auth_user_id);

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
          {hasExistingAccount && (
            <>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Compte actif
              </Badge>
              <Button
                variant="outline"
                size="sm"
                disabled={resendingCredentials}
                onClick={async () => {
                  setResendingCredentials(true);
                  try {
                    const { error } = await supabase.functions.invoke("resend-credentials", {
                      body: { apprenant_id: apprenantId },
                    });
                    if (error) throw error;
                    toast.success("Identifiants renvoyés par email");
                  } catch {
                    toast.error("Erreur lors de l'envoi");
                  } finally {
                    setResendingCredentials(false);
                  }
                }}
              >
                {resendingCredentials ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Renvoyer identifiants
              </Button>
            </>
          )}
          <Button
            variant={hasExistingAccount ? "outline" : "default"}
            size="sm"
            onClick={() => setShowCreateDialog(true)}
          >
            <KeyRound className="w-4 h-4 mr-2" />
            {hasExistingAccount ? "Configurer l'accès" : "Créer un compte"}
          </Button>
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

      {/* Create Account Dialog */}
      {showCreateDialog && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                {hasExistingAccount ? "Configurer l'accès cours" : "Créer un compte apprenant"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {hasExistingAccount
                  ? <>Mettez à jour la formation, les dates et les modules de <strong>{apprenant.prenom} {apprenant.nom}</strong>.</>
                  : <>Un compte sera créé pour <strong>{apprenant.prenom} {apprenant.nom}</strong> ({apprenant.email || "email manquant"}).</>}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Formation</label>
                  <Select value={selectedFormationForAccount} onValueChange={setSelectedFormationForAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir la formation" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPTE_FORMATIONS.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Date début cours en ligne</label>
                  <Input type="date" value={accountStartDate} onChange={(e) => setAccountStartDate(e.target.value)} />
                </div>

                <div className="space-y-1 md:col-start-2">
                  <label className="text-sm font-medium">Date fin cours en ligne</label>
                  <Input type="date" value={accountEndDate} onChange={(e) => setAccountEndDate(e.target.value)} />
                </div>
              </div>

              {/* Modules de la formation — ordered */}
              {selectedFormationForAccount && ORDERED_FORMATION_MODULES[selectedFormationForAccount] && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Modules de la formation</p>
                  <div className="max-h-44 overflow-y-auto border rounded-md p-3 space-y-1 bg-muted/30">
                    {ORDERED_FORMATION_MODULES[selectedFormationForAccount].map((mod) => (
                      <div key={mod.id} className="flex items-center gap-2 text-sm px-2 py-1">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium">{mod.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Modules supplémentaires</p>
                <div className="max-h-44 overflow-y-auto border rounded-md p-3 space-y-2">
                  {accountAdditionalModuleChoices.map((mod) => (
                    <label key={mod.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                      <Checkbox
                        checked={accountExtraModules.includes(mod.id)}
                        onCheckedChange={() => toggleAccountExtraModule(mod.id)}
                      />
                      <span className={cn(!accountExtraModules.includes(mod.id) && "text-muted-foreground")}>{mod.nom}</span>
                    </label>
                  ))}
                </div>
              </div>

              {!hasExistingAccount && generatedPassword && (
                <div className="bg-muted p-3 rounded-md space-y-1">
                  <p className="text-sm font-medium">Mot de passe généré :</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-background px-2 py-1 rounded border">{generatedPassword}</code>
                    <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(generatedPassword); toast.success("Copié !"); }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
              <Button
                disabled={creatingAccount || !selectedFormationForAccount || (!hasExistingAccount && !apprenant.email)}
                onClick={async () => {
                  setCreatingAccount(true);
                  try {
                    const mergedModules = Array.from(new Set([...accountBaseModules, ...accountExtraModules]));
                    const mappedType = ACCOUNT_FORMATION_TO_TYPE[selectedFormationForAccount] || null;
                    const mappedFormation = ACCOUNT_FORMATION_TO_DB_FORMATION[selectedFormationForAccount] || null;

                    const { error: updateError } = await supabase
                      .from("apprenants")
                      .update({
                        type_apprenant: mappedType,
                        formation_choisie: mappedFormation,
                        date_debut_cours_en_ligne: accountStartDate || null,
                        date_fin_cours_en_ligne: accountEndDate || null,
                        modules_autorises: mergedModules.length > 0 ? mergedModules : null,
                      } as any)
                      .eq("id", apprenantId);

                    if (updateError) throw updateError;

                    if (hasExistingAccount) {
                      toast.success("Accès cours mis à jour");
                      queryClient.invalidateQueries({ queryKey: ["apprenant-detail", apprenantId] });
                      setShowCreateDialog(false);
                      return;
                    }

                    const { data, error } = await supabase.functions.invoke("create-apprenant-account", {
                      body: {
                        apprenant_id: apprenantId,
                        email: apprenant.email,
                      },
                    });

                    if (error) throw error;
                    setGeneratedPassword(data?.password || "");
                    toast.success("Compte créé avec succès !");
                    queryClient.invalidateQueries({ queryKey: ["apprenant-detail", apprenantId] });
                  } catch (err: any) {
                    toast.error(err?.message || "Erreur lors de l'opération");
                  } finally {
                    setCreatingAccount(false);
                  }
                }}
              >
                {creatingAccount ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                {hasExistingAccount ? "Enregistrer" : "Créer le compte"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
          <TabsTrigger value="delete-account" className="text-sm text-destructive">Supprimer compte cours</TabsTrigger>
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
          {activeTab === "delete-account" && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="w-5 h-5" />
                  Supprimer le compte cours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {apprenant.auth_user_id ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Cette action supprime le <strong>compte cours en ligne</strong> de l'apprenant (identifiants de connexion, progression, quiz, activités).
                      Le dossier administratif (fiche apprenant, documents, factures) sera conservé.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (!confirm("Êtes-vous sûr de vouloir supprimer le compte cours de cet apprenant ? Sa progression sera définitivement perdue.")) return;
                        try {
                          const { data: sessionData } = await supabase.auth.getSession();
                          const token = sessionData?.session?.access_token;
                          const res = await supabase.functions.invoke("delete-apprenant-account", {
                            body: { apprenant_id: apprenantId },
                            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                          });
                          if (res.error || res.data?.error) {
                            toast.error(res.data?.error || res.error?.message || "Erreur lors de la suppression");
                          } else {
                            toast.success(res.data?.message || "Compte cours supprimé");
                            queryClient.invalidateQueries({ queryKey: ["apprenant", apprenantId] });
                          }
                        } catch (err: any) {
                          toast.error(err.message || "Erreur inattendue");
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer le compte cours
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Cet apprenant n'a pas de compte cours actif.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </Tabs>
    </div>
  );
}
