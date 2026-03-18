import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Mail, 
  Phone, 
  FileText, 
  Plus, 
  Search,
  UserCog,
  X,
  Download,
  Loader2,
  CheckCircle,
  CheckCircle2,
  XCircle,
  GraduationCap,
  StickyNote,
  CreditCard,
  Euro,
  Save,
  Send,
  UserPlus,
  Pencil,
  KeyRound,
  Copy,
  Printer
} from "lucide-react";
import { MODULES_DATA } from "@/components/cours-en-ligne/formations-data";
import { ALL_MODULES, FORMATION_MODULES, MANAGED_MODULE_IDS, DEFAULT_MODULES_BY_TYPE } from "@/components/cours-en-ligne/modules-config";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { generateEmargementPDF } from "./EmargementGenerator";
import { generateEmargementIndividuelPDF, AgendaDaySlot } from "./EmargementIndividuelGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Session {
  id: string;
  title: string;
  formation: string;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  formateur: string;
  participants: number;
  maxParticipants: number;
  status: string;
  type_session?: string;
}

interface SessionDetailProps {
  session: Session | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToApprenant?: (apprenantId: string) => void;
}

// Interface pour l'apprenant depuis la base de données
interface ApprenantDB {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  type_apprenant: string | null;
  mode_financement: string | null;
  numero_dossier_cma: string | null;
  date_debut_formation: string | null;
  date_fin_formation: string | null;
  date_examen_theorique: string | null;
  date_examen_pratique: string | null;
  statut: string | null;
}

const modesFinancement = [
  { value: "cpf", label: "CPF", color: "bg-purple-100 text-purple-700" },
  { value: "personnel", label: "Personnel", color: "bg-gray-100 text-gray-700" },
  { value: "opco", label: "OPCO", color: "bg-blue-100 text-blue-700" },
  { value: "france_travail", label: "France Travail", color: "bg-orange-100 text-orange-700" },
  { value: "autre", label: "Autre", color: "bg-slate-100 text-slate-700" },
];

const ORDERED_FORMATION_MODULES = Object.fromEntries(
  Object.entries(FORMATION_MODULES).map(([k, v]) => [k, v.modules])
);

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
  vtc: "vtc", "vtc-e": "vtc-e", taxi: "taxi", "taxi-e": "taxi-e",
  ta: "ta", "ta-e": "ta-e", va: "va", "va-e": "va-e",
};

const ACCOUNT_FORMATION_TO_DB_FORMATION: Record<string, string> = {
  vtc: "vtc", "vtc-e": "vtc-elearning", taxi: "taxi", "taxi-e": "taxi-elearning",
  ta: "passerelle-taxi", "ta-e": "passerelle-taxi-elearning",
  va: "passerelle-vtc-elearning", "va-e": "passerelle-vtc-elearning",
};

const getTypeBadgeColor = (type: string | null) => {
  if (!type) return "bg-gray-100 text-gray-700";
  const t = type.toLowerCase();
  if (t.includes("taxi")) return "bg-yellow-100 text-yellow-700";
  if (t.includes("vtc")) return "bg-blue-100 text-blue-700";
  if (t.includes("ta")) return "bg-green-100 text-green-700";
  if (t.includes("va")) return "bg-purple-100 text-purple-700";
  return "bg-gray-100 text-gray-700";
};

const getFinancementBadge = (mode: string | null) => {
  if (!mode) return { value: "autre", label: "Non défini", color: "bg-gray-100 text-gray-700" };
  const financement = modesFinancement.find(f => f.value === mode);
  return financement || { value: mode, label: mode, color: "bg-gray-100 text-gray-700" };
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "confirmed":
    case "confirmee":
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Confirmée</Badge>;
    case "pending":
    case "planifiee":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Planifiée</Badge>;
    case "cancelled":
    case "annulee":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Annulée</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

function NotesPopover({ 
  sessionApprenantId, 
  notes, 
  onSave 
}: { 
  sessionApprenantId: string; 
  notes: string; 
  onSave: (notes: string) => void 
}) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    onSave(localNotes);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 px-2 gap-1 ${notes ? "text-primary" : "text-muted-foreground"}`}
        >
          <StickyNote className="w-4 h-4" />
          {notes ? "Notes" : "Ajouter notes"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <Label>Notes pour cet apprenant</Label>
          <Textarea 
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            placeholder="Ajouter des notes..."
            className="min-h-[100px]"
          />
          <Button onClick={handleSave} size="sm" className="w-full gap-2">
            <Save className="w-4 h-4" />
            Enregistrer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PaiementPopover({ 
  sessionApprenantId, 
  montantTotal, 
  montantPaye, 
  moyenPaiement,
  datePaiement,
  onSave 
}: { 
  sessionApprenantId: string; 
  montantTotal: number; 
  montantPaye: number; 
  moyenPaiement: string;
  datePaiement: string;
  onSave: (data: { montant_paye?: number; moyen_paiement?: string; date_paiement?: string | null }) => void 
}) {
  const [localMontantPaye, setLocalMontantPaye] = useState(montantPaye);
  const [localMoyenPaiement, setLocalMoyenPaiement] = useState(moyenPaiement);
  const [localDatePaiement, setLocalDatePaiement] = useState(datePaiement);
  const [open, setOpen] = useState(false);

  const resteAPayer = montantTotal - localMontantPaye;

  const handleSave = () => {
    onSave({
      montant_paye: localMontantPaye,
      moyen_paiement: localMoyenPaiement,
      date_paiement: localDatePaiement || null
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 px-2 gap-1 ${montantPaye > 0 ? "text-green-600" : "text-muted-foreground"}`}
        >
          <Euro className="w-4 h-4" />
          {montantPaye > 0 ? `${montantPaye}€ payé` : "Paiement"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium">Gestion du paiement</h4>
          
          <div className="space-y-2">
            <Label>Montant total (€)</Label>
            <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 flex items-center text-muted-foreground">
              {montantTotal.toFixed(2)} €
            </div>
            <p className="text-xs text-muted-foreground">Modifiable dans la fiche apprenant</p>
          </div>

          <div className="space-y-2">
            <Label>Montant payé (€)</Label>
            <Input 
              type="number"
              value={localMontantPaye}
              onChange={(e) => setLocalMontantPaye(parseFloat(e.target.value) || 0)}
              placeholder="Ex: 500"
            />
          </div>

          <div className="space-y-2">
            <Label>Moyen de paiement</Label>
            <Select value={localMoyenPaiement} onValueChange={setLocalMoyenPaiement}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="especes">Espèces</SelectItem>
                <SelectItem value="cb">Carte bancaire</SelectItem>
                <SelectItem value="cheque">Chèque</SelectItem>
                <SelectItem value="virement">Virement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date de paiement</Label>
            <Input 
              type="date"
              value={localDatePaiement}
              onChange={(e) => setLocalDatePaiement(e.target.value)}
            />
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex justify-between text-sm">
              <span>Reste à payer:</span>
              <span className={`font-bold ${resteAPayer > 0 ? "text-orange-600" : "text-green-600"}`}>
                {resteAPayer.toFixed(2)} €
              </span>
            </div>
          </div>

          <Button onClick={handleSave} size="sm" className="w-full gap-2">
            <Save className="w-4 h-4" />
            Enregistrer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SessionDetail({ session, open, onOpenChange, onNavigateToApprenant }: SessionDetailProps) {
  const [searchApprenant, setSearchApprenant] = useState("");
  const [showAddApprenant, setShowAddApprenant] = useState(false);
  const [showAddFormateur, setShowAddFormateur] = useState(false);
  const [searchFormateur, setSearchFormateur] = useState("");
  const [showHorsSession, setShowHorsSession] = useState(false);
  const [searchHorsSession, setSearchHorsSession] = useState("");
  const [sendingEmailForApprenant, setSendingEmailForApprenant] = useState<string | null>(null);
  const [emailPreview, setEmailPreview] = useState<{
    templateId: string;
    apprenant: any;
    subject: string;
    body: string;
    label: string;
  } | null>(null);
  const [emailPreviewEditing, setEmailPreviewEditing] = useState(false);
  const [selectedApprenants, setSelectedApprenants] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<{ template: any; apprenants: any[]; previewBody: string; previewSubject: string; editedBody?: string; editedSubject?: string } | null>(null);
  const [bulkPreviewEditing, setBulkPreviewEditing] = useState(false);
  const [editingMailType, setEditingMailType] = useState<any | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  // --- Account creation state ---
  const [accountDialogApprenant, setAccountDialogApprenant] = useState<any | null>(null);
  const [selectedFormationForAccount, setSelectedFormationForAccount] = useState("");
  const [accountStartDate, setAccountStartDate] = useState("");
  const [accountEndDate, setAccountEndDate] = useState("");
  const [accountExtraModules, setAccountExtraModules] = useState<number[]>([]);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [resendingCredentials, setResendingCredentials] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Charger les apprenants de cette session depuis la base de données
  const { data: apprenantsInSession = [], isLoading: loadingApprenants, refetch: refetchApprenants } = useQuery({
    queryKey: ['session-apprenants', session?.id],
    queryFn: async () => {
      if (!session?.id) return [];
      
      const { data, error } = await supabase
        .from('session_apprenants')
        .select(`
          id,
          apprenant_id,
          mode_financement,
          date_debut,
          date_fin,
          notes,
          presence_pratique,
          montant_total,
          montant_paye,
          moyen_paiement,
          statut_suivi,
          apprenant:apprenants (
            id,
            nom,
            prenom,
            email,
            telephone,
            type_apprenant,
            mode_financement,
            numero_dossier_cma,
            date_debut_formation,
            date_fin_formation,
            date_examen_theorique,
            date_examen_pratique,
            resultat_examen,
            statut,
            montant_ttc,
            montant_paye,
            moyen_paiement,
            notes,
            civilite,
            adresse,
            code_postal,
            ville,
            auth_user_id,
            date_debut_cours_en_ligne,
            date_fin_cours_en_ligne
          )
        `)
        .eq('session_id', session.id);
      
      if (error) {
        console.error('[SessionDetail] Erreur chargement apprenants:', error);
        return [];
      }
      console.log('[SessionDetail] apprenantsInSession chargés:', data?.length, data);
      return data || [];
    },
    enabled: !!session?.id && open,
  });

  // Charger les formateurs de cette session
  const { data: formateursInSession = [], isLoading: loadingFormateurs, refetch: refetchFormateurs } = useQuery({
    queryKey: ['session-formateurs', session?.id],
    queryFn: async () => {
      if (!session?.id) return [];
      
      const { data, error } = await supabase
        .from('session_formateurs')
        .select(`
          id,
          heures_effectuees,
          presence,
          formateur:formateurs (
            id,
            nom,
            prenom,
            email,
            telephone,
            specialites,
            type,
            civilite
          )
        `)
        .eq('session_id', session.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.id && open,
  });

  // Charger tous les apprenants pour l'ajout
  const { data: allApprenants = [] } = useQuery({
    queryKey: ['all-apprenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apprenants')
        .select('id, nom, prenom, email, telephone, type_apprenant, mode_financement, numero_dossier_cma, date_debut_formation, date_fin_formation, date_examen_theorique, date_examen_pratique, statut')
        .order('nom', { ascending: true });
      
      if (error) throw error;
      return data as ApprenantDB[];
    },
    enabled: open,
  });

  // Charger tous les formateurs pour l'ajout
  const { data: allFormateurs = [] } = useQuery({
    queryKey: ['all-formateurs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formateurs')
        .select('id, nom, prenom, email, telephone, specialites, type, civilite')
        .order('nom', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Charger les mails types depuis la base de données
  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['email_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('label');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Charger les convocations envoyées pour les apprenants de cette session
   const { data: convocationsSent = [] } = useQuery({
     queryKey: ['convocations-sent', session?.id, apprenantsInSession.map((sa: any) => sa.apprenant?.id).join(',')],
     queryFn: async () => {
       const apprenantIds = apprenantsInSession
         .map((sa: any) => sa.apprenant?.id)
         .filter(Boolean);
       if (apprenantIds.length === 0) return [];
       
       const { data, error } = await supabase
         .from('emails')
         .select('apprenant_id, subject, sent_at')
          .in('apprenant_id', apprenantIds)
          .ilike('subject', '%convocation%')
          .eq('type', 'sent');
       
       if (error) throw error;
       return data || [];
     },
     enabled: !!session?.id && open && apprenantsInSession.length > 0,
   });

    const hasConvocation = (apprenantId: string) => {
      return convocationsSent.some((c: any) => c.apprenant_id === apprenantId);
    };

   // Charger les identifiants envoyés pour les apprenants de cette session
    const { data: identifiantsSent = [] } = useQuery({
      queryKey: ['identifiants-sent', session?.id, apprenantsInSession.map((sa: any) => sa.apprenant?.id).join(',')],
      queryFn: async () => {
        const apprenantIds = apprenantsInSession
          .map((sa: any) => sa.apprenant?.id)
          .filter(Boolean);
        if (apprenantIds.length === 0) return [];
        
        const { data, error } = await supabase
          .from('emails')
          .select('apprenant_id, subject, sent_at')
           .in('apprenant_id', apprenantIds)
           .ilike('subject', '%identifiant%')
           .eq('type', 'sent');
        
        if (error) throw error;
        return data || [];
      },
      enabled: !!session?.id && open && apprenantsInSession.length > 0,
    });

    const hasIdentifiants = (apprenantId: string) => {
      return identifiantsSent.some((c: any) => c.apprenant_id === apprenantId);
    };

  // --- Account creation helpers ---
  const inferAccountFormationId = (apprenant: any): string => {
    const type = (apprenant?.type_apprenant || "").toLowerCase();
    if (type.startsWith("taxi")) return "taxi";
    if (type.startsWith("ta")) return "ta";
    if (type.startsWith("va")) return "va";
    return "vtc";
  };

  const accountBaseModules = useMemo(() => {
    return DEFAULT_MODULES_BY_TYPE[selectedFormationForAccount] || [] as number[];
  }, [selectedFormationForAccount]);

  const accountAdditionalModuleChoices = useMemo(
    () => MODULES_DATA.filter((m) => MANAGED_MODULE_IDS.has(m.id) && !accountBaseModules.includes(m.id)),
    [accountBaseModules]
  );

  const toggleAccountExtraModule = (id: number) => {
    setAccountExtraModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const openAccountDialog = (apprenant: any) => {
    setAccountDialogApprenant(apprenant);
    const inferredId = inferAccountFormationId(apprenant);
    setSelectedFormationForAccount(inferredId);
    setAccountStartDate(apprenant.date_debut_cours_en_ligne || apprenant.date_debut_formation || "");
    setAccountEndDate(apprenant.date_fin_cours_en_ligne || apprenant.date_fin_formation || "");
    setAccountExtraModules([]);
    setGeneratedPassword("");
  };

  const handleCreateAccount = async () => {
    if (!accountDialogApprenant) return;
    setCreatingAccount(true);
    try {
      const mergedModules = Array.from(new Set([...accountBaseModules, ...accountExtraModules]));
      const mappedType = ACCOUNT_FORMATION_TO_TYPE[selectedFormationForAccount] || null;
      const mappedFormation = ACCOUNT_FORMATION_TO_DB_FORMATION[selectedFormationForAccount] || null;
      const appId = accountDialogApprenant.id;

      const { error: updateError } = await supabase
        .from("apprenants")
        .update({
          type_apprenant: mappedType,
          formation_choisie: mappedFormation,
          date_debut_cours_en_ligne: accountStartDate || null,
          date_fin_cours_en_ligne: accountEndDate || null,
          modules_autorises: mergedModules.length > 0 ? mergedModules : null,
        } as any)
        .eq("id", appId);

      if (updateError) throw updateError;

      const hasExisting = Boolean(accountDialogApprenant.auth_user_id);
      if (hasExisting) {
        toast({ title: "Accès cours mis à jour", description: "Les paramètres ont été enregistrés." });
        refetchApprenants();
        setAccountDialogApprenant(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-apprenant-account", {
        body: { apprenant_id: appId, email: accountDialogApprenant.email },
      });

      if (error) throw error;
      setGeneratedPassword(data?.password || "");
      // Log email for identifiants badge
      await supabase.from("emails").insert({
        apprenant_id: appId,
        subject: "Identifiants de connexion - Cours en ligne",
        type: "sent",
        sent_at: new Date().toISOString(),
        recipients: [accountDialogApprenant.email],
        sender_email: "noreply@ftransport.fr",
      });
      toast({ title: "Compte créé avec succès !", description: `Un email a été envoyé à ${accountDialogApprenant.email}.` });
      queryClient.invalidateQueries({ queryKey: ['identifiants-sent'] });
      refetchApprenants();
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Erreur lors de l'opération", variant: "destructive" });
    } finally {
      setCreatingAccount(false);
    }
  };

  if (!session) return null;

  const sessionApprenantIds = apprenantsInSession.map((sa: any) => sa.apprenant?.id);
  const apprenantsNotInSession = allApprenants.filter(a => 
    !sessionApprenantIds.includes(a.id) &&
    (a.nom.toLowerCase().includes(searchApprenant.toLowerCase()) ||
     a.prenom.toLowerCase().includes(searchApprenant.toLowerCase()) ||
     (a.email?.toLowerCase() || "").includes(searchApprenant.toLowerCase()))
  );

  const sessionFormateurIds = formateursInSession.map((sf: any) => sf.formateur?.id);
  const formateursNotInSession = allFormateurs.filter(f => 
    !sessionFormateurIds.includes(f.id) &&
    (f.nom.toLowerCase().includes(searchFormateur.toLowerCase()) ||
     f.prenom.toLowerCase().includes(searchFormateur.toLowerCase()) ||
     (f.email?.toLowerCase() || "").includes(searchFormateur.toLowerCase()))
  );

  const addApprenant = async (apprenantId: string) => {
    try {
      const { error } = await supabase
        .from('session_apprenants')
        .insert({
          session_id: session.id,
          apprenant_id: apprenantId,
        });
      
      if (error) throw error;
      
      refetchApprenants();
      setShowAddApprenant(false);
      toast({
        title: "Apprenant ajouté",
        description: "L'apprenant a été ajouté à la session.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'ajout",
        variant: "destructive",
      });
    }
  };

  const removeApprenant = async (sessionApprenantId: string) => {
    try {
      const { error } = await supabase
        .from('session_apprenants')
        .delete()
        .eq('id', sessionApprenantId);
      
      if (error) throw error;
      
      refetchApprenants();
      toast({
        title: "Apprenant retiré",
        description: "L'apprenant a été retiré de la session.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du retrait",
        variant: "destructive",
      });
    }
  };

  const addFormateur = async (formateurId: string) => {
    try {
      const { error } = await supabase
        .from('session_formateurs')
        .insert({
          session_id: session.id,
          formateur_id: formateurId,
        });
      
      if (error) throw error;
      
      refetchFormateurs();
      setShowAddFormateur(false);
      toast({
        title: "Formateur ajouté",
        description: "Le formateur a été ajouté à la session.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'ajout",
        variant: "destructive",
      });
    }
  };

  const removeFormateur = async (sessionFormateurId: string) => {
    try {
      const { error } = await supabase
        .from('session_formateurs')
        .delete()
        .eq('id', sessionFormateurId);
      
      if (error) throw error;
      
      refetchFormateurs();
      toast({
        title: "Formateur retiré",
        description: "Le formateur a été retiré de la session.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du retrait",
        variant: "destructive",
      });
    }
  };


  const togglePresenceFormateur = async (sessionFormateurId: string, currentPresence: string) => {
    // Cycle: present → absent → excuse → present
    const next = currentPresence === 'present' ? 'absent' : currentPresence === 'absent' ? 'excuse' : 'present';
    const { error } = await supabase
      .from('session_formateurs')
      .update({ presence: next })
      .eq('id', sessionFormateurId);
    if (!error) refetchFormateurs();
  };


  const updateSessionApprenant = async (
    sessionApprenantId: string, 
    updates: { notes?: string; presence_pratique?: string | null; statut_suivi?: string | null }
  ) => {
    try {
      const { error } = await supabase
        .from('session_apprenants')
        .update(updates)
        .eq('id', sessionApprenantId);
      
      if (error) throw error;
      
      refetchApprenants();
      toast({
        title: "Notes mises à jour",
        description: "Les notes ont été enregistrées.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  // Fonction pour mettre à jour le paiement dans apprenants
  const updateApprenantPaiement = async (
    apprenantId: string, 
    updates: { montant_paye?: number; moyen_paiement?: string; date_paiement?: string | null; notes?: string }
  ) => {
    try {
      const { error } = await supabase
        .from('apprenants')
        .update(updates)
        .eq('id', apprenantId);
      
      if (error) throw error;
      
      refetchApprenants();
      toast({
        title: "Paiement mis à jour",
        description: "Les informations de paiement ont été enregistrées.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  // Fonction pour convertir "20 Jan 2026" en Date
  const parseFrenchDate = (dateStr: string): Date => {
    const months: { [key: string]: number } = {
      "Jan": 0, "Fév": 1, "Mars": 2, "Avr": 3, "Mai": 4, "Juin": 5,
      "Juil": 6, "Août": 7, "Sept": 8, "Oct": 9, "Nov": 10, "Déc": 11,
      "janv.": 0, "févr.": 1, "mars": 2, "avr.": 3, "mai": 4, "juin": 5,
      "juil.": 6, "août": 7, "sept.": 8, "oct.": 9, "nov.": 10, "déc.": 11
    };
    
    const parts = dateStr.split(" ");
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = months[parts[1]] ?? 0;
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
    return new Date();
  };

  const handleDownloadEmargement = () => {
    if (apprenantsInSession.length === 0) {
      toast({
        title: "Aucun apprenant",
        description: "Ajoutez des apprenants à la session pour générer les feuilles d'émargement.",
        variant: "destructive",
      });
      return;
    }

    const dateDebut = session.dateDebut;
    const dateFin = session.dateFin;

    // Récupérer les noms des formateurs assignés
    const formateurNames = formateursInSession.length > 0 
      ? formateursInSession.map((sf: any) => {
          const f = sf.formateur;
          return f ? `${f.prenom} ${f.nom}` : "Non défini";
        })
      : [session.formateur || "GUENICHI Naoufal"];

    const sessionData = {
      title: session.title,
      formation: session.formation,
      dateDebut: dateDebut,
      dateFin: dateFin,
      lieu: session.lieu,
      formateurs: formateurNames,
    };

    const apprenantsList = apprenantsInSession.map((sa: any) => ({
      id: parseInt(sa.apprenant?.id?.slice(-4) || "0", 16) || 1,
      nom: sa.apprenant?.nom || "",
      prenom: sa.apprenant?.prenom || "",
    }));

    generateEmargementPDF(sessionData, apprenantsList);

    toast({
      title: "Feuilles d'émargement générées",
      description: `${apprenantsList.length} feuille(s) d'émargement téléchargée(s).`,
    });
  };

  const isFormationContinue = session.title?.toLowerCase().includes('continue');

  const getFormationTypeLocal = (typeApprenant: string | null | undefined): string => {
    const type = (typeApprenant || '').toLowerCase();
    if (type.includes('ta-e') || type === 'ta') return 'TAXI (mobilité VTC vers TAXI)';
    if (type.includes('va-e') || type === 'va') return 'VTC (mobilité TAXI vers VTC)';
    if (type.includes('taxi')) return 'TAXI';
    if (type.includes('vtc')) return 'VTC';
    return 'TAXI / VTC';
  };

  const formatDateFr = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '[date à compléter]';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return dateStr;
      const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
      return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const replaceTemplateVars = (template: string, a: any): string => {
    const formation = getFormationTypeLocal(a.type_apprenant);
    const dateDebutRaw = a.date_debut_formation || session.dateDebut || null;
    const dateFinRaw = a.date_fin_formation || session.dateFin || null;
    const dateDebut = formatDateFr(dateDebutRaw);
    const dateFin = formatDateFr(dateFinRaw);
    const dateExamenTheorique = formatDateFr(a.date_examen_theorique);
    const dateExamenPratique = formatDateFr(a.date_examen_pratique);
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const bookingUrl = `https://insight-learn-manage.lovable.app/reservation-pratique?id=${a.id}&type=${formation.toLowerCase().includes('vtc') ? 'vtc' : 'taxi'}`;
    const onboardingUrl = 'https://insight-learn-manage.lovable.app/bienvenue';

    return template
      .replace(/\{\{prenom\}\}/g, a.prenom || '')
      .replace(/\{\{nom\}\}/g, a.nom || '')
      .replace(/\{\{formation\}\}/g, formation)
      .replace(/\{\{date_debut\}\}/g, dateDebut)
      .replace(/\{\{date_fin\}\}/g, dateFin)
      .replace(/\{\{date_examen_theorique\}\}/g, dateExamenTheorique)
      .replace(/\{\{date_examen_pratique\}\}/g, dateExamenPratique)
      .replace(/\{\{date_jour\}\}/g, today)
      .replace(/\{\{civilite\}\}/g, a.civilite || '')
      .replace(/\{\{adresse\}\}/g, a.adresse || '')
      .replace(/\{\{code_postal\}\}/g, a.code_postal || '')
      .replace(/\{\{ville\}\}/g, a.ville || '')
      .replace(/\{\{onboarding_url\}\}/g, onboardingUrl)
      .replace(/\{\{booking_url\}\}/g, bookingUrl);
  };


  const handlePreviewTemplateEmail = (templateId: string, apprenant: any) => {
    const template = emailTemplates.find((t: any) => t.id === templateId);
    if (!template) return;

    if (!apprenant.email) {
      toast({
        title: "Pas d'email",
        description: `${apprenant.prenom} ${apprenant.nom} n'a pas d'adresse email.`,
        variant: "destructive",
      });
      return;
    }

    const subject = replaceTemplateVars(template.subject_template, apprenant);
    const body = replaceTemplateVars(template.body_template, apprenant);

    setEmailPreview({ templateId, apprenant, subject, body, label: template.label });
  };

  const handleConfirmSendEmail = async () => {
    if (!emailPreview) return;
    const { apprenant, subject, body } = emailPreview;
    const label = emailPreview.label;

    setSendingEmailForApprenant(apprenant.id);
    setEmailPreview(null);

    try {
      await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'send',
          apprenantId: apprenant.id,
          userEmail: 'contact@ftransport.fr',
          to: apprenant.email,
          subject,
          body,
        },
      });
      toast({
        title: "Email envoyé",
        description: `"${label}" envoyé à ${apprenant.prenom} ${apprenant.nom}.`,
      });
      await queryClient.invalidateQueries({ queryKey: ['convocations-sent'] });
    } catch {
      toast({
        title: "Erreur",
        description: `Échec de l'envoi à ${apprenant.prenom} ${apprenant.nom}.`,
        variant: "destructive",
      });
    }

    setSendingEmailForApprenant(null);
  };

  const toggleSelectApprenant = (id: string) => {
    setSelectedApprenants(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedApprenants.size === apprenantsInSession.length) {
      setSelectedApprenants(new Set());
    } else {
      setSelectedApprenants(new Set(apprenantsInSession.map((sa: any) => sa.apprenant?.id).filter(Boolean)));
    }
  };

  const handleBulkSendEmail = async (templateId: string) => {
    const template = emailTemplates.find((t: any) => t.id === templateId);
    if (!template) return;

    const selectedList = apprenantsInSession
      .filter((sa: any) => sa.apprenant && selectedApprenants.has(sa.apprenant.id) && sa.apprenant.email)
      .map((sa: any) => sa.apprenant);

    if (selectedList.length === 0) {
      toast({ title: "Aucun apprenant sélectionné", description: "Cochez au moins un apprenant avec une adresse email.", variant: "destructive" });
      return;
    }

    // Show preview with first apprenant as example
    const previewSubject = replaceTemplateVars(template.subject_template, selectedList[0]);
    const previewBody = replaceTemplateVars(template.body_template, selectedList[0]);
    setBulkPreview({ template, apprenants: selectedList, previewSubject, previewBody });
  };

  const handleConfirmBulkSend = async () => {
    if (!bulkPreview) return;
    const { template, apprenants, editedBody, editedSubject } = bulkPreview;
    const useEditedBody = editedBody !== undefined;
    const useEditedSubject = editedSubject !== undefined;
    setBulkPreview(null);
    setBulkPreviewEditing(false);
    setBulkSending(true);
    let sent = 0;
    let failed = 0;

    for (const apprenant of apprenants) {
      const subject = useEditedSubject ? replaceTemplateVars(editedSubject, apprenant) : replaceTemplateVars(template.subject_template, apprenant);
      const body = useEditedBody ? replaceTemplateVars(editedBody, apprenant) : replaceTemplateVars(template.body_template, apprenant);
      try {
        await supabase.functions.invoke('sync-outlook-emails', {
          body: {
            action: 'send',
            apprenantId: apprenant.id,
            userEmail: 'contact@ftransport.fr',
            to: apprenant.email,
            subject,
            body,
          },
        });
        sent++;
      } catch {
        failed++;
      }
    }

    toast({
      title: "Envoi groupé terminé",
      description: `${sent} email(s) envoyé(s)${failed > 0 ? `, ${failed} échec(s)` : ''}.`,
    });
    await queryClient.invalidateQueries({ queryKey: ['convocations-sent'] });
    setBulkSending(false);
    setSelectedApprenants(new Set());
  };


  const countByType = (type: string) => {
    return apprenantsInSession.filter((sa: any) => {
      const t = sa.apprenant?.type_apprenant?.toLowerCase() || "";
      return t.includes(type.toLowerCase());
    }).length;
  };

  const taxiCount = countByType("taxi");
  const vtcCount = countByType("vtc");
  const totalCount = apprenantsInSession.length;
  const formateursCount = formateursInSession.length;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              {session.title}
              {getStatusBadge(session.status)}
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadEmargement}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Feuilles d'émargement
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Session Info */}
        <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-muted/50 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-medium">{format(new Date(session.dateDebut), "dd MMM yyyy", { locale: fr })} au {format(new Date(session.dateFin), "dd MMM yyyy", { locale: fr })}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{session.lieu}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{totalCount}/{session.maxParticipants} participants</span>
          </div>
          {formateursInSession.length > 0 && (
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-muted-foreground" />
              <span>
                {formateursInSession.map((sf: any) => {
                  const f = sf.formateur;
                  return f ? `${f.prenom} ${f.nom}` : "";
                }).filter(Boolean).join(", ")}
              </span>
            </div>
          )}
        </div>

        <Tabs defaultValue="apprenants" className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="apprenants" className="gap-2">
              <Users className="w-4 h-4" />
              Apprenants ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="formateurs" className="gap-2">
              <UserCog className="w-4 h-4" />
              Formateurs ({formateursCount})
            </TabsTrigger>
          </TabsList>

          {/* Apprenants Tab */}
          <TabsContent value="apprenants" className="flex-1 min-h-0 overflow-auto flex flex-col mt-4">
            {/* Barre d'envoi groupé */}
            <div className="shrink-0 flex items-center gap-3 mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Checkbox 
                checked={apprenantsInSession.length > 0 && selectedApprenants.size === apprenantsInSession.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium text-foreground">
                {selectedApprenants.size > 0 ? `${selectedApprenants.size} sélectionné(s)` : "Tout sélectionner"}
              </span>
              <div className="flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="default" 
                    className="gap-2"
                    disabled={selectedApprenants.size === 0 || bulkSending}
                  >
                    {bulkSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Envoyer un mail type ({selectedApprenants.size})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto w-72">
                  {emailTemplates.map((t: any) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => handleBulkSendEmail(t.id)}
                      className="cursor-pointer"
                    >
                      <span className="text-sm">{t.label}</span>
                    </DropdownMenuItem>
                  ))}
                  {emailTemplates.length === 0 && (
                    <DropdownMenuItem disabled>Aucun modèle</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                size="sm" 
                variant={showAddApprenant ? "secondary" : "outline"}
                onClick={() => setShowAddApprenant(!showAddApprenant)}
                className="gap-1"
              >
                {showAddApprenant ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddApprenant ? "Fermer" : "Ajouter"}
              </Button>
            </div>


            {showAddApprenant && (
              <div className="shrink-0 mb-4 p-3 border rounded-lg bg-muted/30">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un apprenant..."
                    value={searchApprenant}
                    onChange={(e) => setSearchApprenant(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {apprenantsNotInSession.slice(0, 10).map((apprenant) => (
                      <div 
                        key={apprenant.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => addApprenant(apprenant.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {apprenant.prenom?.[0]}{apprenant.nom?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{apprenant.prenom} {apprenant.nom}</p>
                            <p className="text-xs text-muted-foreground">{apprenant.email || "Pas d'email"}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="gap-1">
                          <Plus className="w-4 h-4" /> Ajouter
                        </Button>
                      </div>
                    ))}
                    {apprenantsNotInSession.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun apprenant disponible
                      </p>
                    )}
                    {apprenantsNotInSession.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        ... et {apprenantsNotInSession.length - 10} autres (affinez votre recherche)
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {loadingApprenants ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="max-h-[45vh] overflow-y-auto pr-2">
                <div className="space-y-3 p-1">
                  {apprenantsInSession.map((sessionApprenant: any) => {
                    const apprenant = sessionApprenant.apprenant ?? allApprenants.find((a) => a.id === sessionApprenant.apprenant_id);
                    if (!apprenant) {
                      console.warn('[SessionDetail] apprenant introuvable pour session_apprenant:', sessionApprenant.id, 'apprenant_id:', sessionApprenant.apprenant_id);
                      return (
                        <div key={sessionApprenant.id} className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                          <p className="text-sm text-destructive">Apprenant introuvable (ID: {sessionApprenant.apprenant_id?.slice(0, 8)}…)</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div 
                        key={sessionApprenant.id}
                        className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                      >
                        {/* Ligne 1: Checkbox + Avatar + Nom + Badge */}
                        <div className="flex items-center gap-3 mb-2">
                          <Checkbox 
                            checked={selectedApprenants.has(apprenant.id)}
                            onCheckedChange={() => toggleSelectApprenant(apprenant.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Avatar className="w-9 h-9 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                              {apprenant.prenom?.[0] || ""}{apprenant.nom?.[0] || ""}
                            </AvatarFallback>
                          </Avatar>
                          <span 
                            className="font-semibold text-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onNavigateToApprenant) {
                                onOpenChange(false);
                                onNavigateToApprenant(apprenant.id);
                              }
                            }}
                          >{apprenant.prenom} {apprenant.nom}</span>
                          <Badge className={`text-xs shrink-0 ${getTypeBadgeColor(apprenant.type_apprenant)}`}>
                            {apprenant.type_apprenant?.toUpperCase() || "N/A"}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0 ml-auto"
                            onClick={() => removeApprenant(sessionApprenant.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Ligne 2: Coordonnées complètes */}
                        <div className="space-y-1 mb-3 pl-[52px]">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span>{apprenant.numero_dossier_cma || "CMA non défini"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span>{apprenant.email || "Email non défini"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>{apprenant.telephone || "Téléphone non défini"}</span>
                          </div>
                        </div>

                        {/* Ligne 3: Badges statut */}
                        <div className="flex items-center gap-1.5 mb-3 pl-[52px] flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            hasConvocation(apprenant.id) 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {hasConvocation(apprenant.id) ? '✅ Convoqué' : '❌ Non convoqué'}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            hasIdentifiants(apprenant.id) 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {hasIdentifiants(apprenant.id) ? '🔑 Identifiants' : '🔑 Non envoyés'}
                          </span>
                          <Badge className={`text-[10px] px-2 py-0 ${getFinancementBadge(sessionApprenant.mode_financement || apprenant.mode_financement).color}`}>
                            {getFinancementBadge(sessionApprenant.mode_financement || apprenant.mode_financement).label}
                          </Badge>
                          {sessionApprenant.statut_suivi && (
                            <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${
                              sessionApprenant.statut_suivi === 'inscription_validee' || sessionApprenant.statut_suivi === 'document_complet'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {sessionApprenant.statut_suivi === 'inscription_validee' ? '✅ Validé' :
                               sessionApprenant.statut_suivi === 'document_complet' ? '✅ Dossier complet' :
                               sessionApprenant.statut_suivi === 'manque_document' ? '📄 Manque doc' :
                               sessionApprenant.statut_suivi === 'a_payer' ? '💰 À payer' :
                               sessionApprenant.statut_suivi === 'mdp_change' ? '🔑 MDP changé' :
                               '⚠️ ' + sessionApprenant.statut_suivi}
                            </span>
                          )}
                          {apprenant.resultat_examen === 'oui' && (
                            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">✅ Théorie réussie</span>
                          )}
                          {apprenant.resultat_examen === 'non' && (
                            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">❌ Théorie échouée</span>
                          )}
                          {apprenant.resultat_examen === 'absent' && (
                            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">🔶 Absent examen</span>
                          )}
                          {session.type_session === 'pratique' && (
                            <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${
                              sessionApprenant.presence_pratique === 'absent' ? 'bg-red-100 text-red-700' :
                              sessionApprenant.presence_pratique === 'deplace' ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {sessionApprenant.presence_pratique === 'absent' ? '❌ Absent' :
                               sessionApprenant.presence_pratique === 'deplace' ? '📅 Déplacé' :
                               '✅ Présent'}
                            </span>
                          )}
                        </div>

                        {/* Ligne 4: Boutons d'action sur ligne séparée */}
                        <div className="flex items-center gap-2 pt-3 border-t flex-wrap pl-[52px]">
                          {[
                            { icon: FileText, title: "Télécharger émargement", print: false },
                            { icon: Printer, title: "Imprimer émargement", print: true },
                          ].map(({ icon: Icon, title, print: isPrint }) => (
                           <Button
                             key={title}
                             size="sm"
                             variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                              title={title}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const type = (apprenant.type_apprenant || '').toLowerCase();
                                const isTA = type === 'ta' || type === 'ta-e';
                                const isVA = type === 'va' || type === 'va-e';
                                const isTaxi = type.includes('taxi') || isTA;
                                const formationLabel = isTaxi ? 'Formation TAXI' : 'Formation VTC';
                                const formateurNames = (isTA || isVA)
                                  ? ["Rim TOUIL"]
                                  : ["Naoufal GUENICHI", "Rim TOUIL"];

                                const dateDebut = new Date(session.dateDebut);
                                const dateFin = new Date(session.dateFin);
                                const { data: blocs } = await supabase
                                  .from('agenda_blocs')
                                  .select('*')
                                  .gte('semaine_debut', session.dateDebut)
                                  .lte('semaine_debut', session.dateFin);

                                const matchFormation = (f: string) => {
                                  const fl = f.toLowerCase();
                                  if (fl.includes('taxi et vtc') || fl.includes('taxi & vtc')) return true;
                                  if (isTaxi && fl.includes('taxi')) return true;
                                  if (!isTaxi && fl.includes('vtc')) return true;
                                  return false;
                                };

                                const relevantBlocs = (blocs || []).filter(b => matchFormation(b.formation));

                                const dayMap = new Map<string, { date: Date; slots: { debut: string; fin: string }[] }>();
                                for (const bloc of relevantBlocs) {
                                  const weekStart = new Date(bloc.semaine_debut);
                                  const actualDate = new Date(weekStart);
                                  actualDate.setDate(weekStart.getDate() + bloc.jour);
                                  if (actualDate < dateDebut || actualDate > dateFin) continue;
                                  const key = actualDate.toISOString().slice(0, 10);
                                  if (!dayMap.has(key)) {
                                    dayMap.set(key, { date: actualDate, slots: [] });
                                  }
                                  dayMap.get(key)!.slots.push({ debut: bloc.heure_debut, fin: bloc.heure_fin });
                                }

                                const agendaDays: AgendaDaySlot[] = Array.from(dayMap.entries())
                                  .sort(([a], [b]) => a.localeCompare(b))
                                  .map(([, val]) => {
                                    const morningSlots = val.slots.filter(s => s.debut < '12:30');
                                    const afternoonSlots = val.slots.filter(s => s.debut >= '12:30');
                                    const result: AgendaDaySlot = { date: val.date };
                                    if (morningSlots.length > 0) {
                                      result.matinDebut = morningSlots.reduce((min, s) => s.debut < min ? s.debut : min, morningSlots[0].debut);
                                      result.matinFin = morningSlots.reduce((max, s) => s.fin > max ? s.fin : max, morningSlots[0].fin);
                                    }
                                    if (afternoonSlots.length > 0) {
                                      result.apremDebut = afternoonSlots.reduce((min, s) => s.debut < min ? s.debut : min, afternoonSlots[0].debut);
                                      result.apremFin = afternoonSlots.reduce((max, s) => s.fin > max ? s.fin : max, afternoonSlots[0].fin);
                                    }
                                    return result;
                                  });

                                if (agendaDays.length === 0) {
                                  toast({ title: "Aucun cours trouvé", description: "Aucun bloc agenda trouvé pour cette session.", variant: "destructive" });
                                  return;
                                }

                                generateEmargementIndividuelPDF(
                                  {
                                    formation: formationLabel,
                                    dateDebut: session.dateDebut,
                                    dateFin: session.dateFin,
                                    lieu: session.lieu,
                                    formateurs: formateurNames,
                                  },
                                  { nom: apprenant.nom, prenom: apprenant.prenom, type_apprenant: apprenant.type_apprenant || '' },
                                  agendaDays,
                                  { print: isPrint }
                                );
                                toast({ title: isPrint ? "Impression lancée" : "Emargement individuel genere", description: `Feuille pour ${apprenant.prenom} ${apprenant.nom} ${isPrint ? 'ouverte pour impression.' : 'telechargee.'}` });
                              }}
                            >
                              <Icon className="w-4 h-4" />
                            </Button>
                          ))}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-muted-foreground hover:text-primary"
                                title="Mail type"
                                disabled={sendingEmailForApprenant === apprenant.id}
                              >
                                {sendingEmailForApprenant === apprenant.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                                <span className="text-xs">Mail</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto w-72">
                              {emailTemplates.map((t: any) => (
                                <div key={t.id} className="flex items-center">
                                  <DropdownMenuItem
                                    onClick={() => handlePreviewTemplateEmail(t.id, apprenant)}
                                    className="cursor-pointer flex-1"
                                  >
                                    <span className="text-sm">{t.label}</span>
                                  </DropdownMenuItem>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 mr-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingMailType(t);
                                      setEditLabel(t.label);
                                      setEditSubject(t.subject_template);
                                      setEditBody(t.body_template);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              {emailTemplates.length === 0 && (
                                <DropdownMenuItem disabled>Aucun modèle</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <NotesPopover 
                            sessionApprenantId={sessionApprenant.id}
                            notes={sessionApprenant.notes || apprenant.notes || ""}
                            onSave={(notes) => updateSessionApprenant(sessionApprenant.id, { notes })}
                          />

                          <Select
                            value={sessionApprenant.statut_suivi || ''}
                            onValueChange={async (val) => {
                              await updateSessionApprenant(sessionApprenant.id, { statut_suivi: val || null });
                            }}
                          >
                            <SelectTrigger className={`h-8 w-auto gap-1 text-xs border ${
                              sessionApprenant.statut_suivi === 'inscription_validee' ? 'border-green-300 text-green-700' :
                              sessionApprenant.statut_suivi === 'document_complet' ? 'border-green-300 text-green-700' :
                              sessionApprenant.statut_suivi ? 'border-orange-300 text-orange-700' : ''
                            }`}>
                              <SelectValue placeholder="⚙️ Statut" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manque_document">📄 Manque un document</SelectItem>
                              <SelectItem value="manque_piece_identite">📋 Manque pièce d'identité</SelectItem>
                              <SelectItem value="manque_justificatif_domicile">🏠 Manque justificatif domicile</SelectItem>
                              <SelectItem value="manque_permis">🚗 Manque permis</SelectItem>
                              <SelectItem value="manque_signature">✍️ Manque signature</SelectItem>
                              <SelectItem value="manque_photo">📸 Manque photo</SelectItem>
                              <SelectItem value="document_complet">✅ Dossier complet</SelectItem>
                              <SelectItem value="mdp_change">🔑 MDP changé</SelectItem>
                              <SelectItem value="email_non_valide">📧 Email non validé</SelectItem>
                              <SelectItem value="injoignable">📵 Injoignable</SelectItem>
                              <SelectItem value="a_payer">💰 À payer</SelectItem>
                              <SelectItem value="inscription_validee">✅ Inscription validée</SelectItem>
                            </SelectContent>
                          </Select>

                          {session.type_session === 'pratique' && (
                            <Select
                              value={sessionApprenant.presence_pratique || 'present'}
                              onValueChange={async (val) => {
                                await updateSessionApprenant(sessionApprenant.id, { presence_pratique: val });
                              }}
                            >
                              <SelectTrigger className="h-8 w-auto text-xs">
                                <SelectValue placeholder="Présence" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">✅ Présent</SelectItem>
                                <SelectItem value="absent">❌ Absent</SelectItem>
                                <SelectItem value="deplace">📅 Déplacé</SelectItem>
                              </SelectContent>
                            </Select>
                          )}

                          {(sessionApprenant.mode_financement === "personnel" || apprenant.mode_financement === "personnel") && (
                            <PaiementPopover 
                              sessionApprenantId={apprenant.id}
                              montantTotal={apprenant.montant_ttc || 0}
                              montantPaye={apprenant.montant_paye || 0}
                              moyenPaiement={apprenant.moyen_paiement || ""}
                              datePaiement={apprenant.date_paiement || ""}
                              onSave={(data) => updateApprenantPaiement(apprenant.id, data)}
                            />
                          )}

                          <Button
                            size="sm"
                            variant={apprenant.auth_user_id ? "outline" : "default"}
                            className="h-8 gap-1 text-xs"
                            onClick={(e) => { e.stopPropagation(); openAccountDialog(apprenant); }}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            {apprenant.auth_user_id ? "Configurer l'accès" : "Créer un compte"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {apprenantsInSession.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucun apprenant dans cette session</p>
                      <p className="text-sm">Cliquez sur "Ajouter" pour en ajouter</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Récapitulatif par type de formation */}
            <div className="shrink-0 mt-4 p-3 rounded-lg bg-muted/50 border">
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">🚕 TAXI</Badge>
                  <span className="font-medium">{taxiCount}</span>
                </div>
                <span className="text-muted-foreground">+</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">🚗 VTC</Badge>
                  <span className="font-medium">{vtcCount}</span>
                </div>
                <span className="text-muted-foreground">=</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    className={`${
                      totalCount > 18 
                        ? "bg-red-100 text-red-700 hover:bg-red-100" 
                        : "bg-primary/10 text-primary hover:bg-primary/10"
                    }`}
                  >
                    📊 TOTAL
                  </Badge>
                  <span className={`font-bold ${totalCount > 18 ? "text-red-600" : ""}`}>
                    {totalCount}
                  </span>
                  <span className="text-muted-foreground">/ 18 max</span>
                </div>
              </div>
            </div>

            {/* Envoyer convocation à un élève hors session */}
            <div className="shrink-0 mt-4">
              <Button
                variant={showHorsSession ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowHorsSession(!showHorsSession)}
                className="gap-2 w-full"
              >
                {showHorsSession ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {showHorsSession ? "Fermer" : "📬 Envoyer une convocation à un élève oublié"}
              </Button>
              {showHorsSession && (
                <div className="mt-3 p-3 border rounded-lg bg-muted/30 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un élève (nom, prénom, email)..."
                      value={searchHorsSession}
                      onChange={(e) => setSearchHorsSession(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {searchHorsSession.length >= 2 && (
                    <div className="max-h-48 overflow-auto space-y-1">
                      {allApprenants
                        .filter(a => 
                          !sessionApprenantIds.includes(a.id) &&
                          (a.nom.toLowerCase().includes(searchHorsSession.toLowerCase()) ||
                           a.prenom.toLowerCase().includes(searchHorsSession.toLowerCase()) ||
                           (a.email || '').toLowerCase().includes(searchHorsSession.toLowerCase()))
                        )
                        .slice(0, 10)
                        .map(a => (
                          <div key={a.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 border">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-sm">{a.nom} {a.prenom}</span>
                              {a.email && <span className="text-xs text-muted-foreground ml-2">{a.email}</span>}
                              {a.type_apprenant && (
                                <Badge variant="outline" className="ml-2 text-[10px]">{a.type_apprenant.toUpperCase()}</Badge>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs">
                                  <Send className="w-3.5 h-3.5" />
                                  Convocation
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto w-72">
                                {emailTemplates
                                  .filter((t: any) => t.id.includes('convocation'))
                                  .map((t: any) => (
                                    <DropdownMenuItem
                                      key={t.id}
                                      onClick={() => handlePreviewTemplateEmail(t.id, a)}
                                      className="cursor-pointer"
                                    >
                                      <span className="text-sm">{t.label}</span>
                                    </DropdownMenuItem>
                                  ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      {allApprenants.filter(a => 
                        !sessionApprenantIds.includes(a.id) &&
                        (a.nom.toLowerCase().includes(searchHorsSession.toLowerCase()) ||
                         a.prenom.toLowerCase().includes(searchHorsSession.toLowerCase()) ||
                         (a.email || '').toLowerCase().includes(searchHorsSession.toLowerCase()))
                      ).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">Aucun élève trouvé</p>
                      )}
                    </div>
                  )}
                  {searchHorsSession.length < 2 && (
                    <p className="text-xs text-muted-foreground text-center">Tapez au moins 2 caractères pour rechercher</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Formateurs Tab */}
          <TabsContent value="formateurs" className="flex-1 min-h-0 overflow-hidden flex flex-col mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground">Formateurs assignés</h4>
              <Button 
                size="sm" 
                variant={showAddFormateur ? "secondary" : "default"}
                onClick={() => setShowAddFormateur(!showAddFormateur)}
                className="gap-1"
              >
                {showAddFormateur ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddFormateur ? "Fermer" : "Ajouter"}
              </Button>
            </div>

            {showAddFormateur && (
              <div className="mb-4 p-3 border rounded-lg bg-muted/30">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un formateur..."
                    value={searchFormateur}
                    onChange={(e) => setSearchFormateur(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {formateursNotInSession.map((formateur) => (
                      <div 
                        key={formateur.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => addFormateur(formateur.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                              {formateur.prenom?.[0]}{formateur.nom?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{formateur.civilite ? `${formateur.civilite} ` : ""}{formateur.prenom} {formateur.nom}</p>
                            <p className="text-xs text-muted-foreground">{formateur.specialites || formateur.type || "Pas de spécialité"}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="gap-1">
                          <Plus className="w-4 h-4" /> Ajouter
                        </Button>
                      </div>
                    ))}
                    {formateursNotInSession.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun formateur disponible
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {loadingFormateurs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="space-y-3">
                  {formateursInSession.map((sessionFormateur: any) => {
                    const formateur = sessionFormateur.formateur;
                    if (!formateur) return null;
                    
                    return (
                      <div 
                        key={sessionFormateur.id}
                        className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-accent text-accent-foreground font-medium">
                                {formateur.prenom?.[0] || ""}{formateur.nom?.[0] || ""}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">
                                  {formateur.civilite ? `${formateur.civilite} ` : ""}{formateur.prenom} {formateur.nom}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {formateur.type === "externe" ? "Externe" : "Interne"}
                                </Badge>
                                {/* Badge présence */}
                                <button
                                  onClick={() => togglePresenceFormateur(sessionFormateur.id, sessionFormateur.presence || 'present')}
                                  title="Cliquer pour changer la présence"
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium border transition-colors cursor-pointer ${
                                    (sessionFormateur.presence || 'present') === 'present'
                                      ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                                      : (sessionFormateur.presence) === 'absent'
                                      ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
                                      : 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
                                  }`}
                                >
                                  {(sessionFormateur.presence || 'present') === 'present' ? '✓ Présent' 
                                    : sessionFormateur.presence === 'absent' ? '✗ Absent'
                                    : '~ Excusé'}
                                </button>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                {formateur.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {formateur.email}
                                  </span>
                                )}
                                {formateur.telephone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {formateur.telephone}
                                  </span>
                                )}
                              </div>
                              {formateur.specialites && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Spécialités : {formateur.specialites}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                            onClick={() => removeFormateur(sessionFormateur.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {formateursInSession.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserCog className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucun formateur assigné</p>
                      <p className="text-sm">Cliquez sur "Ajouter" pour assigner un formateur</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Modale d'aperçu email */}
    <Dialog open={!!emailPreview} onOpenChange={(open) => !open && setEmailPreview(null)}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Aperçu du mail
          </DialogTitle>
        </DialogHeader>
        {emailPreview && (
          <div className="flex-1 overflow-auto space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground w-10">À :</span>
                <span className="font-medium">{emailPreview.apprenant.prenom} {emailPreview.apprenant.nom} &lt;{emailPreview.apprenant.email}&gt;</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground w-10">Objet :</span>
                {emailPreviewEditing ? (
                  <Input 
                    value={emailPreview.subject} 
                    onChange={(e) => setEmailPreview({...emailPreview, subject: e.target.value})}
                    className="flex-1"
                  />
                ) : (
                  <span className="font-semibold">{emailPreview.subject}</span>
                )}
              </div>
            </div>
            {emailPreviewEditing ? (
              <Textarea 
                value={emailPreview.body}
                onChange={(e) => setEmailPreview({...emailPreview, body: e.target.value})}
                className="min-h-[350px] font-mono text-xs"
              />
            ) : (
              <div className="border rounded-lg p-4 bg-muted/30 overflow-auto max-h-[400px]">
                <div 
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: emailPreview.body }} 
                />
              </div>
            )}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setEmailPreviewEditing(!emailPreviewEditing)} className="gap-2">
                <Pencil className="w-4 h-4" />
                {emailPreviewEditing ? "Aperçu" : "Modifier"}
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setEmailPreview(null); setEmailPreviewEditing(false); }}>
                  Annuler
                </Button>
                <Button 
                  onClick={() => { setEmailPreviewEditing(false); handleConfirmSendEmail(); }}
                  className="gap-2"
                  disabled={sendingEmailForApprenant === emailPreview.apprenant.id}
                >
                  {sendingEmailForApprenant === emailPreview.apprenant.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Confirmer l'envoi
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Dialog pour modifier un mail type */}
    <Dialog open={!!editingMailType} onOpenChange={(open) => !open && setEditingMailType(null)}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Modifier le mail type
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Nom du modèle</Label>
            <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
          </div>
          <div>
            <Label>Objet de l'email</Label>
            <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
          </div>
          <div>
            <Label>Corps de l'email (HTML autorisé)</Label>
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="min-h-[300px] font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <span className="text-xs text-muted-foreground">
              Variables : <code className="bg-muted px-1 rounded">{"{{prenom}}"}</code> <code className="bg-muted px-1 rounded">{"{{nom}}"}</code> <code className="bg-muted px-1 rounded">{"{{formation}}"}</code> <code className="bg-muted px-1 rounded">{"{{date_debut}}"}</code> <code className="bg-muted px-1 rounded">{"{{date_fin}}"}</code> <code className="bg-muted px-1 rounded">{"{{date_examen_theorique}}"}</code> <code className="bg-muted px-1 rounded">{"{{date_examen_pratique}}"}</code> <code className="bg-muted px-1 rounded">{"{{civilite}}"}</code>
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingMailType(null)}>
              Annuler
            </Button>
            <Button onClick={async () => {
              if (!editingMailType) return;
              const { error } = await supabase
                .from('email_templates')
                .update({ label: editLabel, subject_template: editSubject, body_template: editBody })
                .eq('id', editingMailType.id);
              if (error) {
                toast({ title: "Erreur", description: error.message, variant: "destructive" });
              } else {
                toast({ title: "Modèle mis à jour", description: "Le mail type a été enregistré." });
                queryClient.invalidateQueries({ queryKey: ['email_templates'] });
                setEditingMailType(null);
              }
            }} className="gap-2">
              <Save className="w-4 h-4" />
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modale aperçu envoi groupé */}
    <Dialog open={!!bulkPreview} onOpenChange={(open) => !open && setBulkPreview(null)}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Envoi groupé — Aperçu
          </DialogTitle>
        </DialogHeader>
        {bulkPreview && (
          <div className="flex-1 overflow-auto space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Destinataires ({bulkPreview.apprenants.length})</Label>
              <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/30 max-h-[120px] overflow-y-auto">
                {bulkPreview.apprenants.map((a: any) => (
                  <Badge key={a.id} variant="secondary" className="text-xs gap-1">
                    <Mail className="w-3 h-3" />
                    {a.prenom} {a.nom}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Objet</Label>
              {bulkPreviewEditing ? (
                <Input 
                  value={bulkPreview.editedSubject ?? bulkPreview.template.subject_template}
                  onChange={(e) => setBulkPreview({...bulkPreview, editedSubject: e.target.value, previewSubject: replaceTemplateVars(e.target.value, bulkPreview.apprenants[0])})}
                />
              ) : (
                <div className="text-sm font-semibold p-2 rounded border bg-muted/20">{bulkPreview.previewSubject}</div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Contenu (personnalisé pour chaque élève)</Label>
              {bulkPreviewEditing ? (
                <Textarea 
                  value={bulkPreview.editedBody ?? bulkPreview.template.body_template}
                  onChange={(e) => setBulkPreview({...bulkPreview, editedBody: e.target.value, previewBody: replaceTemplateVars(e.target.value, bulkPreview.apprenants[0])})}
                  className="min-h-[300px] font-mono text-xs"
                />
              ) : (
                <div className="border rounded-lg p-4 bg-muted/30 overflow-auto max-h-[300px]">
                  <div 
                    className="prose prose-sm max-w-none text-foreground"
                    dangerouslySetInnerHTML={{ __html: bulkPreview.previewBody }} 
                  />
                </div>
              )}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setBulkPreviewEditing(!bulkPreviewEditing)} className="gap-2">
                <Pencil className="w-4 h-4" />
                {bulkPreviewEditing ? "Aperçu" : "Modifier"}
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setBulkPreview(null); setBulkPreviewEditing(false); }}>
                  Annuler
                </Button>
                <Button onClick={() => { setBulkPreviewEditing(false); handleConfirmBulkSend(); }} className="gap-2">
                  <Send className="w-4 h-4" />
                  Envoyer à {bulkPreview.apprenants.length} élève(s)
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Account creation/configuration dialog */}
    {accountDialogApprenant && (
      <Dialog open={!!accountDialogApprenant} onOpenChange={(o) => { if (!o) setAccountDialogApprenant(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              {accountDialogApprenant.auth_user_id ? "Configurer l'accès cours" : "Créer un compte apprenant"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {accountDialogApprenant.auth_user_id
                ? <>Mettez à jour la formation, les dates et les modules de <strong>{accountDialogApprenant.prenom} {accountDialogApprenant.nom}</strong>.</>
                : <>Un compte sera créé pour <strong>{accountDialogApprenant.prenom} {accountDialogApprenant.nom}</strong> ({accountDialogApprenant.email || "email manquant"}).</>}
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

            {selectedFormationForAccount && ORDERED_FORMATION_MODULES[selectedFormationForAccount] && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Modules de la formation</p>
                <div className="max-h-44 overflow-y-auto border rounded-md p-3 space-y-1 bg-muted/30">
                  {ORDERED_FORMATION_MODULES[selectedFormationForAccount].map((mod: any) => (
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
                {accountAdditionalModuleChoices.map((mod: any) => (
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

            {generatedPassword && (
              <div className="bg-muted p-3 rounded-md space-y-2">
                <p className="text-sm font-medium">✅ Compte créé — Mot de passe généré :</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-background px-2 py-1 rounded border">{generatedPassword}</code>
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(generatedPassword); toast({ title: "Copié !" }); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-1"
                  disabled={resendingCredentials}
                  onClick={async () => {
                    setResendingCredentials(true);
                    try {
                      const { error } = await supabase.functions.invoke("resend-credentials", {
                        body: { apprenant_id: accountDialogApprenant.id },
                      });
                      if (error) throw error;
                      // Log email for identifiants badge
                      await supabase.from("emails").insert({
                        apprenant_id: accountDialogApprenant.id,
                        subject: "Identifiants de connexion - Cours en ligne",
                        type: "sent",
                        sent_at: new Date().toISOString(),
                        recipients: [accountDialogApprenant.email],
                        sender_email: "noreply@ftransport.fr",
                      });
                      queryClient.invalidateQueries({ queryKey: ['identifiants-sent'] });
                      toast({ title: "Identifiants renvoyés par email" });
                    } catch {
                      toast({ title: "Erreur", description: "Erreur lors de l'envoi", variant: "destructive" });
                    } finally {
                      setResendingCredentials(false);
                    }
                  }}
                >
                  {resendingCredentials ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Renvoyer identifiants par email
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialogApprenant(null)}>Annuler</Button>
            <Button
              disabled={creatingAccount || !selectedFormationForAccount || (!accountDialogApprenant.auth_user_id && !accountDialogApprenant.email)}
              onClick={handleCreateAccount}
            >
              {creatingAccount ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
              {accountDialogApprenant.auth_user_id ? "Enregistrer" : "Créer le compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
