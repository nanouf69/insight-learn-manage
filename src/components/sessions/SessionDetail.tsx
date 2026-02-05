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
  Save
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

// Modes de financement disponibles
const modesFinancement = [
  { value: "cpf", label: "CPF", color: "bg-purple-100 text-purple-700" },
  { value: "personnel", label: "Personnel", color: "bg-gray-100 text-gray-700" },
  { value: "opco", label: "OPCO", color: "bg-blue-100 text-blue-700" },
  { value: "france_travail", label: "France Travail", color: "bg-orange-100 text-orange-700" },
  { value: "autre", label: "Autre", color: "bg-slate-100 text-slate-700" },
];

// Fonction pour obtenir le badge de type d'apprenant
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

// Composant Popover pour les notes
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

// Composant Popover pour le paiement personnel
function PaiementPopover({ 
  sessionApprenantId, 
  montantTotal, 
  montantPaye, 
  moyenPaiement, 
  onSave 
}: { 
  sessionApprenantId: string; 
  montantTotal: number; 
  montantPaye: number; 
  moyenPaiement: string;
  onSave: (data: { montant_paye?: number; montant_total?: number; moyen_paiement?: string }) => void 
}) {
  const [localMontantTotal, setLocalMontantTotal] = useState(montantTotal);
  const [localMontantPaye, setLocalMontantPaye] = useState(montantPaye);
  const [localMoyenPaiement, setLocalMoyenPaiement] = useState(moyenPaiement);
  const [open, setOpen] = useState(false);

  const resteAPayer = localMontantTotal - localMontantPaye;

  const handleSave = () => {
    onSave({
      montant_total: localMontantTotal,
      montant_paye: localMontantPaye,
      moyen_paiement: localMoyenPaiement
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
            <Input 
              type="number"
              value={localMontantTotal}
              onChange={(e) => setLocalMontantTotal(parseFloat(e.target.value) || 0)}
              placeholder="Ex: 1599"
            />
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
          montant_paye,
          montant_total,
          moyen_paiement,
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
            statut,
            montant_ttc
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

  if (!session) return null;

  const sessionApprenantIds = apprenantsInSession.map((sa: any) => sa.apprenant?.id);
  const apprenantsNotInSession = allApprenants.filter(a => 
    !sessionApprenantIds.includes(a.id) &&
    (a.nom.toLowerCase().includes(searchApprenant.toLowerCase()) ||
     a.prenom.toLowerCase().includes(searchApprenant.toLowerCase()) ||
     (a.email?.toLowerCase() || "").includes(searchApprenant.toLowerCase()))
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

  // Fonction pour mettre à jour les notes et paiements
  const updateSessionApprenant = async (
    sessionApprenantId: string, 
    updates: { notes?: string; montant_paye?: number; montant_total?: number; moyen_paiement?: string }
  ) => {
    try {
      const { error } = await supabase
        .from('session_apprenants')
        .update(updates)
        .eq('id', sessionApprenantId);
      
      if (error) throw error;
      
      refetchApprenants();
      toast({
        title: "Informations mises à jour",
        description: "Les informations ont été enregistrées.",
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

    const dateDebut = parseFrenchDate(session.dateDebut);
    const dateFin = parseFrenchDate(session.dateFin);

    const sessionData = {
      title: session.title,
      formation: session.formation,
      dateDebut: dateDebut.toISOString().split("T")[0],
      dateFin: dateFin.toISOString().split("T")[0],
      lieu: session.lieu,
      formateurs: [session.formateur || "Non défini"],
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              {session.title}
              {getStatusBadge(session.status)}
            </DialogTitle>
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
        </DialogHeader>

        {/* Session Info */}
        <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-muted/50 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-medium">{session.dateDebut} au {session.dateFin}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{session.lieu}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{totalCount}/{session.maxParticipants} participants</span>
          </div>
        </div>

        <Tabs defaultValue="apprenants" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="apprenants" className="gap-2">
              <Users className="w-4 h-4" />
              Apprenants ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="formateurs" className="gap-2">
              <UserCog className="w-4 h-4" />
              Formateurs (0)
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
                              {apprenant.date_debut_formation && apprenant.date_fin_formation 
                                ? `${apprenant.date_debut_formation} - ${apprenant.date_fin_formation}`
                                : apprenant.date_debut_formation || apprenant.date_fin_formation || "Dates non définies"
                              }
                            </span>
                          </div>
                          
                          <Badge className={getFinancementBadge(sessionApprenant.mode_financement || apprenant.mode_financement).color}>
                            {getFinancementBadge(sessionApprenant.mode_financement || apprenant.mode_financement).label}
                          </Badge>
                        </div>

                        {/* Ligne 3: Examen + Notes + Paiement */}
                        <div className="flex items-center justify-between gap-4 pt-2 border-t text-sm">
                          <div className="flex items-center gap-4">
                            {apprenant.date_examen_theorique && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <GraduationCap className="w-3.5 h-3.5" />
                                <span>Examen: {apprenant.date_examen_theorique}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1.5">
                              {apprenant.statut === "admis" ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="text-green-600 font-medium">Réussi</span>
                                </>
                              ) : apprenant.statut === "refuse" || apprenant.statut === "échec" ? (
                                <>
                                  <XCircle className="w-4 h-4 text-red-500" />
                                  <span className="text-red-500 font-medium">Échoué</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">En attente</span>
                              )}
                            </div>
                          </div>

                          {/* Boutons Notes et Paiement */}
                          <div className="flex items-center gap-2">
                            {/* Popover Notes */}
                            <NotesPopover 
                              sessionApprenantId={sessionApprenant.id}
                              notes={sessionApprenant.notes || ""}
                              onSave={(notes) => updateSessionApprenant(sessionApprenant.id, { notes })}
                            />

                            {/* Popover Paiement (seulement si financement personnel) */}
                            {(sessionApprenant.mode_financement === "personnel" || apprenant.mode_financement === "personnel") && (
                              <PaiementPopover 
                                sessionApprenantId={sessionApprenant.id}
                                montantTotal={sessionApprenant.montant_total || apprenant.montant_ttc || 0}
                                montantPaye={sessionApprenant.montant_paye || 0}
                                moyenPaiement={sessionApprenant.moyen_paiement || ""}
                                onSave={(data) => updateSessionApprenant(sessionApprenant.id, data)}
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
            <div className="text-center py-8 text-muted-foreground">
              <UserCog className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Gestion des formateurs</p>
              <p className="text-sm">Cette fonctionnalité sera disponible prochainement</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
