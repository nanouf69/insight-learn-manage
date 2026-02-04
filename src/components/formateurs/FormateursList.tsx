import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Mail, Phone, MapPin, Search, GraduationCap, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FormateurForm } from "./FormateurForm";
import { toast } from "sonner";

const formateurs = [
  {
    id: 1,
    nom: "Jean Dupont",
    email: "jean.dupont@ftransport.fr",
    telephone: "06 12 34 56 78",
    adresse: "15 rue de la Formation, 75001 Paris",
    specialites: ["VTC Initial", "Formation continue VTC", "Passerelle TAXI vers VTC"],
    sessions: [
      { formation: "Formation VTC Initial", date: "20 Jan 2026", horaire: "09:00 - 17:00" },
      { formation: "Formation VTC Initial", date: "03 Fév 2026", horaire: "09:00 - 17:00" },
      { formation: "Passerelle TAXI vers VTC", date: "05 Jan 2026", horaire: "09:00 - 17:00" },
      { formation: "Formation continue VTC", date: "19 Jan 2026", horaire: "09:00 - 17:00" },
      { formation: "Formation VTC Initial", date: "03 Mars 2026", horaire: "09:00 - 17:00" },
    ],
    status: "actif"
  },
  {
    id: 2,
    nom: "Marie Martin",
    email: "marie.martin@ftransport.fr",
    telephone: "06 23 45 67 89",
    adresse: "28 avenue des Transports, 69001 Lyon",
    specialites: ["VTC Initial", "Formation continue TAXI", "Passerelle TAXI vers VTC"],
    sessions: [
      { formation: "Passerelle TAXI vers VTC", date: "02 Fév 2026", horaire: "09:00 - 17:00" },
      { formation: "Formation continue TAXI", date: "26 Jan 2026", horaire: "09:00 - 17:00" },
      { formation: "Formation VTC Initial", date: "17 Fév 2026", horaire: "09:00 - 17:00" },
    ],
    status: "actif"
  },
  {
    id: 3,
    nom: "Pierre Bernard",
    email: "pierre.bernard@ftransport.fr",
    telephone: "06 34 56 78 90",
    adresse: "42 boulevard du Transport, 13001 Marseille",
    specialites: ["TAXI Initial", "Passerelle VTC vers TAXI"],
    sessions: [
      { formation: "Formation TAXI Initial", date: "27 Jan 2026", horaire: "09:00 - 17:00" },
      { formation: "Passerelle VTC vers TAXI", date: "12 Jan 2026", horaire: "09:00 - 17:00" },
      { formation: "Formation TAXI Initial", date: "10 Fév 2026", horaire: "09:00 - 17:00" },
    ],
    status: "actif"
  },
  {
    id: 4,
    nom: "Sophie Lefebvre",
    email: "sophie.lefebvre@ftransport.fr",
    telephone: "06 45 67 89 01",
    adresse: "8 place de la Mobilité, 31000 Toulouse",
    specialites: ["TAXI Initial", "Mobilité PMR", "Passerelle VTC vers TAXI"],
    sessions: [
      { formation: "Formation TAXI Initial", date: "24 Fév 2026", horaire: "09:00 - 17:00" },
      { formation: "Passerelle VTC vers TAXI", date: "09 Fév 2026", horaire: "09:00 - 17:00" },
      { formation: "Mobilité PMR", date: "16 Fév 2026", horaire: "09:00 - 17:00" },
    ],
    status: "actif"
  },
];

export function FormateursList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [formateursData, setFormateursData] = useState(formateurs);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null; name: string }>({
    open: false,
    id: null,
    name: "",
  });

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteDialog({ open: true, id, name });
  };

  const handleConfirmDelete = () => {
    if (deleteDialog.id !== null) {
      setFormateursData(prev => prev.filter(f => f.id !== deleteDialog.id));
      toast.success(`${deleteDialog.name} a été supprimé`);
    }
    setDeleteDialog({ open: false, id: null, name: "" });
  };

  const filteredFormateurs = formateursData.filter(f =>
    f.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.specialites.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Formateurs</h1>
          <p className="text-muted-foreground">Gérez votre équipe de formateurs</p>
        </div>
        <FormateurForm />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{formateursData.length}</p>
            <p className="text-sm text-muted-foreground">Formateurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {formateursData.reduce((acc, f) => acc + f.sessions.length, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Sessions planifiées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {formateursData.filter(f => f.status === "actif").length}
            </p>
            <p className="text-sm text-muted-foreground">Formateurs actifs</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un formateur ou une spécialité..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Formateurs List */}
      <div className="grid gap-4">
        {filteredFormateurs.map((formateur) => (
          <Card key={formateur.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                {/* Avatar & Info */}
                <div className="flex items-start gap-4 flex-1">
                  <Avatar className="w-14 h-14">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {formateur.nom.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-foreground">{formateur.nom}</h3>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          Actif
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteClick(formateur.id, formateur.nom)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Coordonnées */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4" />
                        <span>{formateur.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4" />
                        <span>{formateur.telephone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        <span>{formateur.adresse}</span>
                      </div>
                    </div>

                    {/* Spécialités */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formateur.specialites.map((spec, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          <GraduationCap className="w-3 h-3 mr-1" />
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sessions à venir */}
                <div className="lg:w-80 space-y-2">
                  <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Sessions à venir ({formateur.sessions.length})
                  </h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {formateur.sessions.slice(0, 4).map((session, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/50"
                      >
                        <span className="font-medium text-foreground truncate max-w-[140px]">
                          {session.formation}
                        </span>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{session.date}</span>
                          <Clock className="w-3 h-3" />
                          <span>{session.horaire}</span>
                        </div>
                      </div>
                    ))}
                    {formateur.sessions.length > 4 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{formateur.sessions.length - 4} autres sessions
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce formateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteDialog.name}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}