import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  XCircle,
  GraduationCap,
  StickyNote,
  CreditCard,
  Euro,
  Save,
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateEmargementPDF } from "./EmargementGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
  statut: string | null;
}

const modesFinancement = [
  { value: "cpf", label: "CPF", color: "bg-purple-100 text-purple-700" },
  { value: "personnel", label: "Personnel", color: "bg-gray-100 text-gray-700" },
  { value: "opco", label: "OPCO", color: "bg-blue-100 text-blue-700" },
  { value: "france_travail", label: "France Travail", color: "bg-orange-100 text-orange-700" },
  { value: "autre", label: "Autre", color: "bg-slate-100 text-slate-700" },
];

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

export function SessionDetail({ session, open, onOpenChange }: SessionDetailProps) {
  const [searchApprenant, setSearchApprenant] = useState("");
  const [showAddApprenant, setShowAddApprenant] = useState(false);
  const [showAddFormateur, setShowAddFormateur] = useState(false);
  const [searchFormateur, setSearchFormateur] = useState("");
  const [sendingEmails, setSendingEmails] = useState(false);
  const [sendingTemplateId, setSendingTemplateId] = useState<string | null>(null);
  const { toast } = useToast();

  // Charger les apprenants de cette session depuis la base de données
  const { data: apprenantsInSession = [], isLoading: loadingApprenants, refetch: refetchApprenants } = useQuery({
    queryKey: ['session-apprenants', session?.id],
    queryFn: async () => {
      if (!session?.id) return [];
      
      const { data, error } = await supabase
        .from('session_apprenants')
        .select(`
          id,
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
            resultat_examen,
            statut,
            montant_ttc,
            montant_paye,
            moyen_paiement,
            notes,
            civilite,
            adresse,
            code_postal,
            ville
          )
        `)
        .eq('session_id', session.id);
      
      if (error) throw error;
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
        .select('id, nom, prenom, email, telephone, type_apprenant, mode_financement, numero_dossier_cma, date_debut_formation, date_fin_formation, date_examen_theorique, statut')
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

  const replaceTemplateVars = (template: string, a: any): string => {
    const formation = getFormationTypeLocal(a.type_apprenant);
    const dateDebut = a.date_debut_formation || session.dateDebut || '[date à compléter]';
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const bookingUrl = `https://insight-learn-manage.lovable.app/reservation-pratique?id=${a.id}&type=${formation.toLowerCase().includes('vtc') ? 'vtc' : 'taxi'}`;
    const onboardingUrl = 'https://insight-learn-manage.lovable.app/bienvenue';

    return template
      .replace(/\{\{prenom\}\}/g, a.prenom || '')
      .replace(/\{\{nom\}\}/g, a.nom || '')
      .replace(/\{\{formation\}\}/g, formation)
      .replace(/\{\{date_debut\}\}/g, dateDebut)
      .replace(/\{\{date_jour\}\}/g, today)
      .replace(/\{\{civilite\}\}/g, a.civilite || '')
      .replace(/\{\{adresse\}\}/g, a.adresse || '')
      .replace(/\{\{code_postal\}\}/g, a.code_postal || '')
      .replace(/\{\{ville\}\}/g, a.ville || '')
      .replace(/\{\{onboarding_url\}\}/g, onboardingUrl)
      .replace(/\{\{booking_url\}\}/g, bookingUrl);
  };

  const handleSendTemplateEmail = async (templateId: string) => {
    const template = emailTemplates.find((t: any) => t.id === templateId);
    if (!template) return;

    const apprenantsWithEmail = apprenantsInSession.filter((sa: any) => sa.apprenant?.email);
    
    if (apprenantsWithEmail.length === 0) {
      toast({
        title: "Aucun email",
        description: "Aucun apprenant de cette session n'a d'adresse email.",
        variant: "destructive",
      });
      return;
    }

    setSendingEmails(true);
    setSendingTemplateId(templateId);
    let sent = 0;
    let failed = 0;

    for (const sa of apprenantsWithEmail) {
      const a = sa.apprenant;
      const subject = replaceTemplateVars(template.subject_template, a);
      const body = replaceTemplateVars(template.body_template, a);

      try {
        await supabase.functions.invoke('sync-outlook-emails', {
          body: {
            action: 'send',
            apprenantId: a.id,
            userEmail: 'contact@ftransport.fr',
            to: a.email,
            subject,
            body,
          },
        });
        sent++;
      } catch {
        failed++;
      }
    }

    setSendingEmails(false);
    setSendingTemplateId(null);
    toast({
      title: "Envoi terminé",
      description: `${sent} email(s) "${template.label}" envoyé(s)${failed > 0 ? `, ${failed} échec(s)` : ''}.`,
    });
  };

  // Compter les apprenants par type
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              {session.title}
              {getStatusBadge(session.status)}
            </DialogTitle>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sendingEmails || apprenantsInSession.length === 0}
                    className="gap-2"
                  >
                    {sendingEmails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sendingEmails ? 'Envoi en cours...' : '📩 Envoyer mail type'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto w-72">
                  {emailTemplates.map((t: any) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => handleSendTemplateEmail(t.id)}
                      className="cursor-pointer"
                    >
                      <span className="mr-2">{t.icon}</span>
                      <span className="text-sm">{t.label}</span>
                    </DropdownMenuItem>
                  ))}
                  {emailTemplates.length === 0 && (
                    <DropdownMenuItem disabled>Aucun modèle disponible</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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

        <Tabs defaultValue="apprenants" className="flex-1 flex flex-col overflow-hidden">
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
          <TabsContent value="apprenants" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground">Liste des apprenants</h4>
              <Button 
                size="sm" 
                variant={showAddApprenant ? "secondary" : "default"}
                onClick={() => setShowAddApprenant(!showAddApprenant)}
                className="gap-1"
              >
                {showAddApprenant ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddApprenant ? "Fermer" : "Ajouter"}
              </Button>
            </div>

            {showAddApprenant && (
              <div className="mb-4 p-3 border rounded-lg bg-muted/30">
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
              <ScrollArea className="h-[350px]">
                <div className="space-y-3">
                  {apprenantsInSession.map((sessionApprenant: any) => {
                    const apprenant = sessionApprenant.apprenant;
                    if (!apprenant) return null;
                    
                    return (
                      <div 
                        key={sessionApprenant.id}
                        className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow space-y-3"
                      >
                        {/* Ligne 1: Identité + Badge type + Actions */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {apprenant.prenom?.[0] || ""}{apprenant.nom?.[0] || ""}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{apprenant.prenom} {apprenant.nom}</span>
                                <Badge className={`text-xs ${getTypeBadgeColor(apprenant.type_apprenant)}`}>
                                  {apprenant.type_apprenant?.toUpperCase() || "N/A"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {apprenant.numero_dossier_cma || "CMA non défini"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {apprenant.email || "Non défini"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {apprenant.telephone || "Non défini"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                            onClick={() => removeApprenant(sessionApprenant.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {/* Ligne 2: Dates de formation */}
                        <div className="flex items-center gap-4 pt-2 border-t text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {(() => {
                                const dateDebut = sessionApprenant.date_debut || apprenant.date_debut_formation;
                                const dateFin = sessionApprenant.date_fin || apprenant.date_fin_formation;
                                if (dateDebut && dateFin) {
                                  return `${dateDebut} - ${dateFin}`;
                                }
                                return dateDebut || dateFin || "Dates non définies";
                              })()}
                            </span>
                          </div>
                          
                          <Badge className={getFinancementBadge(sessionApprenant.mode_financement || apprenant.mode_financement).color}>
                            {getFinancementBadge(sessionApprenant.mode_financement || apprenant.mode_financement).label}
                          </Badge>

                          <Select
                            value={sessionApprenant.statut_suivi || ''}
                            onValueChange={async (val) => {
                              await updateSessionApprenant(sessionApprenant.id, { statut_suivi: val || null });
                            }}
                          >
                            <SelectTrigger className={`h-7 w-[200px] text-xs ${
                              sessionApprenant.statut_suivi === 'inscription_validee' ? 'border-green-300 text-green-700' :
                              sessionApprenant.statut_suivi ? 'border-orange-300 text-orange-700' : ''
                            }`}>
                              <SelectValue placeholder="⚙️ Statut suivi" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manque_document">📄 Manque un document</SelectItem>
                              <SelectItem value="mdp_change">🔑 Mot de passe changé</SelectItem>
                              <SelectItem value="email_non_valide">📧 Adresse mail non validée</SelectItem>
                              <SelectItem value="injoignable">📵 Injoignable</SelectItem>
                              <SelectItem value="a_payer">💰 À payer</SelectItem>
                              <SelectItem value="inscription_validee">✅ Inscription validée</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Ligne 3: Présence (pratique) + Examen + Notes + Paiement */}
                        {session.type_session === 'pratique' && (
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <span className="text-sm text-muted-foreground font-medium">Présence :</span>
                            <Select
                              value={sessionApprenant.presence_pratique || 'present'}
                              onValueChange={async (val) => {
                                await updateSessionApprenant(sessionApprenant.id, { presence_pratique: val });
                              }}
                            >
                              <SelectTrigger className="h-7 w-[230px] text-xs">
                                <SelectValue placeholder="Non renseigné" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">✅ Présent</SelectItem>
                                <SelectItem value="absent">❌ Absent</SelectItem>
                                <SelectItem value="deplace">📅 Déplacé à la prochaine session</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-4 pt-2 border-t text-sm">
                          <div className="flex items-center gap-4">
                            {apprenant.date_examen_theorique && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <GraduationCap className="w-3.5 h-3.5" />
                                <span>Examen: {apprenant.date_examen_theorique}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1.5">
                              {apprenant.resultat_examen === 'oui' ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="text-green-600 font-medium">Théorie réussie ✅</span>
                                </>
                              ) : apprenant.resultat_examen === 'non' ? (
                                <>
                                  <XCircle className="w-4 h-4 text-red-500" />
                                  <span className="text-red-500 font-medium">Théorie échouée ❌</span>
                                </>
                              ) : apprenant.resultat_examen === 'absent' ? (
                                <>
                                  <XCircle className="w-4 h-4 text-orange-500" />
                                  <span className="text-orange-500 font-medium">Absent 🔶</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">Résultat en attente</span>
                              )}
                            </div>
                          </div>

                          {/* Boutons Notes et Paiement */}
                          <div className="flex items-center gap-2">
                            <NotesPopover 
                              sessionApprenantId={sessionApprenant.id}
                              notes={sessionApprenant.notes || apprenant.notes || ""}
                              onSave={(notes) => updateSessionApprenant(sessionApprenant.id, { notes })}
                            />

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
                          </div>
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
              </ScrollArea>
            )}

            {/* Récapitulatif par type de formation */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
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
          </TabsContent>

          {/* Formateurs Tab */}
          <TabsContent value="formateurs" className="flex-1 overflow-hidden flex flex-col mt-4">
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
  );
}
