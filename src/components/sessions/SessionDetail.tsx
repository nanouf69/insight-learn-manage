import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
  CreditCard,
  CalendarIcon,
  Pencil
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateEmargementPDF } from "./EmargementGenerator";

interface Session {
  id: number;
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

// Liste des apprenants avec numéro de dossier CMA, type de formation et mode de financement
// typeFormation: "TAXI" = Formation initiale TAXI, "VTC" = Formation initiale VTC
// typeFormation: "TA" = Formation TAXI pour chauffeur VTC (passerelle)
// modeFinancement: "cpf" = CPF, "personnel" = Personnel, "opco" = OPCO, "france_travail" = France Travail, "autre" = Autre
const allApprenants = [
  // Apprenants formation initiale TAXI (présentiel)
  { id: 1, nom: "Martin", prenom: "Lucas", email: "lucas.martin@email.com", telephone: "06 11 22 33 44", numeroCMA: "CMA-2026-001", type: "client", typeFormation: "TAXI" as const, modeFinancement: "cpf" as const },
  { id: 2, nom: "Bernard", prenom: "Sophie", email: "sophie.bernard@email.com", telephone: "06 22 33 44 55", numeroCMA: "CMA-2026-002", type: "client", typeFormation: "TAXI" as const, modeFinancement: "personnel" as const },
  { id: 3, nom: "Petit", prenom: "Thomas", email: "thomas.petit@email.com", telephone: "06 33 44 55 66", numeroCMA: "CMA-2026-003", type: "client", typeFormation: "TAXI" as const, modeFinancement: "opco" as const },
  // Apprenants formation initiale VTC (présentiel)
  { id: 4, nom: "Robert", prenom: "Julie", email: "julie.robert@email.com", telephone: "06 44 55 66 77", numeroCMA: "CMA-2026-004", type: "client", typeFormation: "VTC" as const, modeFinancement: "france_travail" as const },
  { id: 5, nom: "Durand", prenom: "Antoine", email: "antoine.durand@email.com", telephone: "06 55 66 77 88", numeroCMA: "CMA-2026-005", type: "client", typeFormation: "VTC" as const, modeFinancement: "cpf" as const },
  { id: 6, nom: "Moreau", prenom: "Emma", email: "emma.moreau@email.com", telephone: "06 66 77 88 99", numeroCMA: "CMA-2026-006", type: "client", typeFormation: "VTC" as const, modeFinancement: "personnel" as const },
  // Apprenants passerelle TA (chauffeur VTC → TAXI)
  { id: 7, nom: "Laurent", prenom: "Nicolas", email: "nicolas.laurent@email.com", telephone: "06 77 88 99 00", numeroCMA: "CMA-2026-007", type: "client", typeFormation: "TA" as const, modeFinancement: "cpf" as const },
  { id: 8, nom: "Simon", prenom: "Camille", email: "camille.simon@email.com", telephone: "06 88 99 00 11", numeroCMA: "CMA-2026-008", type: "client", typeFormation: "TA" as const, modeFinancement: "opco" as const },
  { id: 9, nom: "Leroy", prenom: "Maxime", email: "maxime.leroy@email.com", telephone: "06 99 00 11 22", numeroCMA: "CMA-2026-009", type: "client", typeFormation: "TA" as const, modeFinancement: "personnel" as const },
  { id: 10, nom: "Garcia", prenom: "Marie", email: "marie.garcia@email.com", telephone: "06 10 11 12 13", numeroCMA: "CMA-2026-010", type: "client", typeFormation: "TA" as const, modeFinancement: "france_travail" as const },
];

// Modes de financement disponibles
const modesFinancement = [
  { value: "cpf", label: "CPF", color: "bg-purple-100 text-purple-700" },
  { value: "personnel", label: "Personnel", color: "bg-gray-100 text-gray-700" },
  { value: "opco", label: "OPCO", color: "bg-blue-100 text-blue-700" },
  { value: "france_travail", label: "France Travail", color: "bg-orange-100 text-orange-700" },
  { value: "autre", label: "Autre", color: "bg-slate-100 text-slate-700" },
];

// Type pour les données d'apprenant dans une session
interface ApprenantSession {
  apprenantId: number;
  modeFinancement: string;
  dateDebut: Date | null;
  dateFin: Date | null;
}

// Liste des formateurs disponibles
const allFormateurs = [
  { id: 1, nom: "Jean Dupont", email: "jean.dupont@ftransport.fr", telephone: "06 12 34 56 78", specialites: ["VTC Initial", "Formation continue VTC"] },
  { id: 2, nom: "Marie Martin", email: "marie.martin@ftransport.fr", telephone: "06 23 45 67 89", specialites: ["VTC Initial", "Formation continue TAXI"] },
  { id: 3, nom: "Pierre Bernard", email: "pierre.bernard@ftransport.fr", telephone: "06 34 56 78 90", specialites: ["TAXI Initial", "Passerelle VTC vers TAXI"] },
  { id: 4, nom: "Sophie Lefebvre", email: "sophie.lefebvre@ftransport.fr", telephone: "06 45 67 89 01", specialites: ["TAXI Initial", "Mobilité PMR"] },
];

export function SessionDetail({ session, open, onOpenChange }: SessionDetailProps) {
  // Données des apprenants dans la session avec financement et dates personnalisées
  const [apprenantSessionData, setApprenantSessionData] = useState<ApprenantSession[]>([
    { apprenantId: 1, modeFinancement: "cpf", dateDebut: null, dateFin: null },
    { apprenantId: 2, modeFinancement: "personnel", dateDebut: null, dateFin: null },
    { apprenantId: 3, modeFinancement: "opco", dateDebut: null, dateFin: null },
    { apprenantId: 5, modeFinancement: "cpf", dateDebut: null, dateFin: null },
    { apprenantId: 6, modeFinancement: "france_travail", dateDebut: null, dateFin: null },
    { apprenantId: 8, modeFinancement: "personnel", dateDebut: null, dateFin: null },
  ]);
  const [sessionFormateurs, setSessionFormateurs] = useState<string[]>(session?.formateur ? [session.formateur] : []);
  const [searchApprenant, setSearchApprenant] = useState("");
  const [searchFormateur, setSearchFormateur] = useState("");
  const [showAddApprenant, setShowAddApprenant] = useState(false);
  const [showAddFormateur, setShowAddFormateur] = useState(false);
  const { toast } = useToast();

  if (!session) return null;

  const sessionApprenantIds = apprenantSessionData.map(a => a.apprenantId);
  const apprenantsInSession = allApprenants.filter(a => sessionApprenantIds.includes(a.id));
  const apprenantsNotInSession = allApprenants.filter(a => 
    !sessionApprenantIds.includes(a.id) &&
    (a.nom.toLowerCase().includes(searchApprenant.toLowerCase()) ||
     a.prenom.toLowerCase().includes(searchApprenant.toLowerCase()) ||
     a.email.toLowerCase().includes(searchApprenant.toLowerCase()))
  );

  const formateursNotInSession = allFormateurs.filter(f => 
    !sessionFormateurs.includes(f.nom) &&
    f.nom.toLowerCase().includes(searchFormateur.toLowerCase())
  );

  const getApprenantSessionData = (apprenantId: number) => {
    return apprenantSessionData.find(a => a.apprenantId === apprenantId);
  };

  const updateApprenantFinancement = (apprenantId: number, modeFinancement: string) => {
    setApprenantSessionData(prev => 
      prev.map(a => a.apprenantId === apprenantId ? { ...a, modeFinancement } : a)
    );
    toast({
      title: "Financement mis à jour",
      description: "Le mode de financement a été modifié.",
    });
  };

  const updateApprenantDates = (apprenantId: number, dateDebut: Date | null, dateFin: Date | null) => {
    setApprenantSessionData(prev => 
      prev.map(a => a.apprenantId === apprenantId ? { ...a, dateDebut, dateFin } : a)
    );
    toast({
      title: "Dates mises à jour",
      description: "Les dates de formation ont été modifiées.",
    });
  };

  const addApprenant = (id: number) => {
    const apprenant = allApprenants.find(a => a.id === id);
    setApprenantSessionData([...apprenantSessionData, { 
      apprenantId: id, 
      modeFinancement: apprenant?.modeFinancement || "personnel",
      dateDebut: null,
      dateFin: null
    }]);
    toast({
      title: "Apprenant ajouté",
      description: "L'apprenant a été ajouté à la session.",
    });
  };

  const removeApprenant = (id: number) => {
    setApprenantSessionData(apprenantSessionData.filter(a => a.apprenantId !== id));
    toast({
      title: "Apprenant retiré",
      description: "L'apprenant a été retiré de la session.",
    });
  };

  const getFinancementBadge = (mode: string) => {
    const financement = modesFinancement.find(f => f.value === mode);
    return financement || { value: mode, label: mode, color: "bg-gray-100 text-gray-700" };
  };

  const addFormateur = (nom: string) => {
    setSessionFormateurs([...sessionFormateurs, nom]);
    setShowAddFormateur(false);
    toast({
      title: "Formateur ajouté",
      description: "Le formateur a été ajouté à la session.",
    });
  };

  const removeFormateur = (nom: string) => {
    setSessionFormateurs(sessionFormateurs.filter(f => f !== nom));
    toast({
      title: "Formateur retiré",
      description: "Le formateur a été retiré de la session.",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Confirmée</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">En attente</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Annulée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Fonction pour convertir "20 Jan 2026" en Date
  const parseFrenchDate = (dateStr: string): Date => {
    const months: { [key: string]: number } = {
      "Jan": 0, "Fév": 1, "Mars": 2, "Avr": 3, "Mai": 4, "Juin": 5,
      "Juil": 6, "Août": 7, "Sept": 8, "Oct": 9, "Nov": 10, "Déc": 11
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
      formateurs: sessionFormateurs.length > 0 ? sessionFormateurs : [session.formateur],
    };

    const apprenantsList = apprenantsInSession.map((a) => ({
      id: a.id,
      nom: a.nom,
      prenom: a.prenom,
    }));

    generateEmargementPDF(sessionData, apprenantsList);

    toast({
      title: "Feuilles d'émargement générées",
      description: `${apprenantsList.length} feuille(s) d'émargement téléchargée(s).`,
    });
  };

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
            <span>{apprenantsInSession.length}/18 participants</span>
          </div>
        </div>

        <Tabs defaultValue="apprenants" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="apprenants" className="gap-2">
              <Users className="w-4 h-4" />
              Apprenants ({apprenantsInSession.length})
            </TabsTrigger>
            <TabsTrigger value="formateurs" className="gap-2">
              <UserCog className="w-4 h-4" />
              Formateurs ({sessionFormateurs.length})
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
                    {apprenantsNotInSession.map((apprenant) => (
                      <div 
                        key={apprenant.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => addApprenant(apprenant.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {apprenant.prenom[0]}{apprenant.nom[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{apprenant.prenom} {apprenant.nom}</p>
                            <p className="text-xs text-muted-foreground">{apprenant.email}</p>
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
                  </div>
                </ScrollArea>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="space-y-3">
                {apprenantsInSession.map((apprenant) => {
                  const sessionData = getApprenantSessionData(apprenant.id);
                  const financement = getFinancementBadge(sessionData?.modeFinancement || "personnel");
                  
                  return (
                    <div 
                      key={apprenant.id}
                      className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {apprenant.prenom[0]}{apprenant.nom[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-foreground">{apprenant.prenom} {apprenant.nom}</p>
                              <Badge 
                                className={`text-xs ${
                                  apprenant.typeFormation === "TAXI" 
                                    ? "bg-blue-100 text-blue-700 hover:bg-blue-100" 
                                    : apprenant.typeFormation === "VTC"
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                      : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                }`}
                              >
                                {apprenant.typeFormation}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                {apprenant.numeroCMA}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {apprenant.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {apprenant.telephone}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeApprenant(apprenant.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Mode de financement et dates */}
                      <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-3">
                        {/* Mode de financement */}
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <Select 
                            value={sessionData?.modeFinancement || "personnel"}
                            onValueChange={(value) => updateApprenantFinancement(apprenant.id, value)}
                          >
                            <SelectTrigger className="h-8 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {modesFinancement.map((mode) => (
                                <SelectItem key={mode.value} value={mode.value}>
                                  <span className={`px-2 py-0.5 rounded text-xs ${mode.color}`}>
                                    {mode.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="h-4 w-px bg-border" />
                        
                        {/* Dates de formation */}
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-8 w-[120px] justify-start text-left font-normal",
                                  !sessionData?.dateDebut && "text-muted-foreground"
                                )}
                              >
                                {sessionData?.dateDebut 
                                  ? format(sessionData.dateDebut, "dd/MM/yyyy") 
                                  : "Début"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={sessionData?.dateDebut || undefined}
                                onSelect={(date) => updateApprenantDates(apprenant.id, date || null, sessionData?.dateFin || null)}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <span className="text-xs text-muted-foreground">au</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-8 w-[120px] justify-start text-left font-normal",
                                  !sessionData?.dateFin && "text-muted-foreground"
                                )}
                              >
                                {sessionData?.dateFin 
                                  ? format(sessionData.dateFin, "dd/MM/yyyy") 
                                  : "Fin"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={sessionData?.dateFin || undefined}
                                onSelect={(date) => updateApprenantDates(apprenant.id, sessionData?.dateDebut || null, date || null)}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Récapitulatif par type de formation - TAXI + VTC = max 18 */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">🚕 TAXI</Badge>
                  <span className="font-medium">{apprenantsInSession.filter(a => a.typeFormation === "TAXI").length}</span>
                </div>
                <span className="text-muted-foreground">+</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">🚗 VTC</Badge>
                  <span className="font-medium">{apprenantsInSession.filter(a => a.typeFormation === "VTC").length}</span>
                </div>
                <span className="text-muted-foreground">=</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    className={`${
                      apprenantsInSession.filter(a => a.typeFormation === "TAXI" || a.typeFormation === "VTC").length > 18 
                        ? "bg-red-100 text-red-700 hover:bg-red-100" 
                        : "bg-primary/10 text-primary hover:bg-primary/10"
                    }`}
                  >
                    📊 TOTAL
                  </Badge>
                  <span className={`font-bold ${
                    apprenantsInSession.filter(a => a.typeFormation === "TAXI" || a.typeFormation === "VTC").length > 18 
                      ? "text-red-600" 
                      : ""
                  }`}>
                    {apprenantsInSession.filter(a => a.typeFormation === "TAXI" || a.typeFormation === "VTC").length}
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
                        onClick={() => addFormateur(formateur.nom)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                              {formateur.nom.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{formateur.nom}</p>
                            <p className="text-xs text-muted-foreground">{formateur.specialites.join(', ')}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="gap-1">
                          <Plus className="w-4 h-4" /> Ajouter
                        </Button>
                      </div>
                    ))}
                    {formateursNotInSession.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Tous les formateurs sont déjà assignés
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {sessionFormateurs.map((formateurNom) => {
                  const formateur = allFormateurs.find(f => f.nom === formateurNom);
                  if (!formateur) return null;
                  
                  return (
                    <div 
                      key={formateur.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-amber-100 text-amber-700 font-medium">
                            {formateur.nom.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{formateur.nom}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {formateur.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {formateur.telephone}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeFormateur(formateur.nom)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
                {sessionFormateurs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucun formateur assigné à cette session
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}