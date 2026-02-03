import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Download
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

// Liste des apprenants avec numéro de dossier CMA et type de formation
// typeFormation: "TA" = Formation TAXI pour chauffeur VTC (devient TAXI)
// typeFormation: "VA" = Formation VTC pour chauffeur TAXI (devient VTC)
const allApprenants = [
  { id: 1, nom: "Martin", prenom: "Lucas", email: "lucas.martin@email.com", telephone: "06 11 22 33 44", numeroCMA: "CMA-2026-001", type: "client", typeFormation: "TA" as const },
  { id: 2, nom: "Bernard", prenom: "Sophie", email: "sophie.bernard@email.com", telephone: "06 22 33 44 55", numeroCMA: "CMA-2026-002", type: "client", typeFormation: "VA" as const },
  { id: 3, nom: "Petit", prenom: "Thomas", email: "thomas.petit@email.com", telephone: "06 33 44 55 66", numeroCMA: "CMA-2026-003", type: "client", typeFormation: "TA" as const },
  { id: 4, nom: "Robert", prenom: "Julie", email: "julie.robert@email.com", telephone: "06 44 55 66 77", numeroCMA: "CMA-2026-004", type: "prospect", typeFormation: "VA" as const },
  { id: 5, nom: "Durand", prenom: "Antoine", email: "antoine.durand@email.com", telephone: "06 55 66 77 88", numeroCMA: "CMA-2026-005", type: "client", typeFormation: "TA" as const },
  { id: 6, nom: "Moreau", prenom: "Emma", email: "emma.moreau@email.com", telephone: "06 66 77 88 99", numeroCMA: "CMA-2026-006", type: "client", typeFormation: "VA" as const },
  { id: 7, nom: "Laurent", prenom: "Nicolas", email: "nicolas.laurent@email.com", telephone: "06 77 88 99 00", numeroCMA: "CMA-2026-007", type: "prospect", typeFormation: "TA" as const },
  { id: 8, nom: "Simon", prenom: "Camille", email: "camille.simon@email.com", telephone: "06 88 99 00 11", numeroCMA: "CMA-2026-008", type: "client", typeFormation: "VA" as const },
];

// Liste des formateurs disponibles
const allFormateurs = [
  { id: 1, nom: "Jean Dupont", email: "jean.dupont@ftransport.fr", telephone: "06 12 34 56 78", specialites: ["VTC Initial", "Formation continue VTC"] },
  { id: 2, nom: "Marie Martin", email: "marie.martin@ftransport.fr", telephone: "06 23 45 67 89", specialites: ["VTC Initial", "Formation continue TAXI"] },
  { id: 3, nom: "Pierre Bernard", email: "pierre.bernard@ftransport.fr", telephone: "06 34 56 78 90", specialites: ["TAXI Initial", "Passerelle VTC vers TAXI"] },
  { id: 4, nom: "Sophie Lefebvre", email: "sophie.lefebvre@ftransport.fr", telephone: "06 45 67 89 01", specialites: ["TAXI Initial", "Mobilité PMR"] },
];

export function SessionDetail({ session, open, onOpenChange }: SessionDetailProps) {
  const [sessionApprenants, setSessionApprenants] = useState<number[]>([1, 2, 3, 5, 6, 8]);
  const [sessionFormateurs, setSessionFormateurs] = useState<string[]>(session?.formateur ? [session.formateur] : []);
  const [searchApprenant, setSearchApprenant] = useState("");
  const [searchFormateur, setSearchFormateur] = useState("");
  const [showAddApprenant, setShowAddApprenant] = useState(false);
  const [showAddFormateur, setShowAddFormateur] = useState(false);
  const { toast } = useToast();

  if (!session) return null;

  const apprenantsInSession = allApprenants.filter(a => sessionApprenants.includes(a.id));
  const apprenantsNotInSession = allApprenants.filter(a => 
    !sessionApprenants.includes(a.id) &&
    (a.nom.toLowerCase().includes(searchApprenant.toLowerCase()) ||
     a.prenom.toLowerCase().includes(searchApprenant.toLowerCase()) ||
     a.email.toLowerCase().includes(searchApprenant.toLowerCase()))
  );

  const formateursNotInSession = allFormateurs.filter(f => 
    !sessionFormateurs.includes(f.nom) &&
    f.nom.toLowerCase().includes(searchFormateur.toLowerCase())
  );

  const addApprenant = (id: number) => {
    setSessionApprenants([...sessionApprenants, id]);
    toast({
      title: "Apprenant ajouté",
      description: "L'apprenant a été ajouté à la session.",
    });
  };

  const removeApprenant = (id: number) => {
    setSessionApprenants(sessionApprenants.filter(a => a !== id));
    toast({
      title: "Apprenant retiré",
      description: "L'apprenant a été retiré de la session.",
    });
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
            <span>{apprenantsInSession.length}/{session.maxParticipants} participants</span>
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
              <div className="space-y-2">
                {apprenantsInSession.map((apprenant) => (
                  <div 
                    key={apprenant.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {apprenant.prenom[0]}{apprenant.nom[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{apprenant.prenom} {apprenant.nom}</p>
                          <Badge 
                            className={`text-xs ${
                              apprenant.typeFormation === "TA" 
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-100" 
                                : "bg-purple-100 text-purple-700 hover:bg-purple-100"
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
                ))}
              </div>
            </ScrollArea>

            {/* Récapitulatif TA/VA et élèves TAXI/VTC */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">🚕 TA</Badge>
                  <span className="font-medium">{apprenantsInSession.filter(a => a.typeFormation === "TA").length}</span>
                  <span className="text-muted-foreground text-xs">Passerelle TAXI</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">🚗 VA</Badge>
                  <span className="font-medium">{apprenantsInSession.filter(a => a.typeFormation === "VA").length}</span>
                  <span className="text-muted-foreground text-xs">Passerelle VTC</span>
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