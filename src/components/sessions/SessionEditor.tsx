import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Loader2, CalendarIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const TYPES_APPRENANT = [
  { value: "VTC", label: "VTC", color: "bg-blue-500" },
  { value: "VTC E", label: "VTC E", color: "bg-blue-400" },
  { value: "VTC E Présentiel", label: "VTC E Présentiel", color: "bg-blue-600" },
  { value: "TAXI", label: "TAXI", color: "bg-yellow-500" },
  { value: "TAXI E", label: "TAXI E", color: "bg-yellow-400" },
  { value: "TAXI E Présentiel", label: "TAXI E Présentiel", color: "bg-yellow-600" },
  { value: "TA", label: "TA", color: "bg-green-500" },
  { value: "TA E", label: "TA E", color: "bg-green-400" },
  { value: "TA E Présentiel", label: "TA E Présentiel", color: "bg-green-600" },
  { value: "VA E", label: "VA E", color: "bg-purple-500" },
  { value: "VA E Présentiel", label: "VA E Présentiel", color: "bg-purple-600" },
];

const CRENEAUX = [
  { value: "9h-16h", label: "9h - 16h" },
  { value: "17h-21h", label: "17h - 21h" },
];

interface Formateur {
  id: string;
  nom: string;
  prenom: string;
}

interface SessionEditorProps {
  session: {
    id: string;
    nom: string | null;
    date_debut: string;
    date_fin: string;
    lieu: string | null;
    places_disponibles: number | null;
    types_apprenant?: string[] | null;
    creneaux?: string[] | null;
    heure_debut?: string | null;
    heure_fin?: string | null;
  };
  onUpdate: () => void;
}

export function SessionEditor({ session, onUpdate }: SessionEditorProps) {
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState(session.nom || "");
  const [dateDebut, setDateDebut] = useState<Date | undefined>(
    session.date_debut ? new Date(session.date_debut) : undefined
  );
  const [dateFin, setDateFin] = useState<Date | undefined>(
    session.date_fin ? new Date(session.date_fin) : undefined
  );
  const [lieu, setLieu] = useState(session.lieu || "");
  const [places, setPlaces] = useState(String(session.places_disponibles || 18));
  const [typesApprenant, setTypesApprenant] = useState<string[]>(session.types_apprenant || []);
  const [creneaux, setCreneaux] = useState<string[]>(session.creneaux || []);
  const [heureDebut, setHeureDebut] = useState(session.heure_debut || "");
  const [heureFin, setHeureFin] = useState(session.heure_fin || "");
  const [selectedFormateurId, setSelectedFormateurId] = useState<string>("");
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFormateurs = async () => {
      const { data } = await supabase.from('formateurs').select('id, nom, prenom');
      if (data) setFormateurs(data);
    };
    const fetchSessionFormateur = async () => {
      const { data } = await supabase
        .from('session_formateurs')
        .select('formateur_id')
        .eq('session_id', session.id)
        .limit(1);
      if (data && data.length > 0) setSelectedFormateurId(data[0].formateur_id);
    };
    fetchFormateurs();
    fetchSessionFormateur();
  }, [session.id]);

  const toggleTypeApprenant = (type: string) => {
    setTypesApprenant(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleCreneau = (creneau: string) => {
    setCreneaux(prev => 
      prev.includes(creneau) 
        ? prev.filter(c => c !== creneau)
        : [...prev, creneau]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dateDebut || !dateFin) {
      toast({
        title: "Erreur",
        description: "Les dates de début et de fin sont requises.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          nom: nom || null,
          date_debut: format(dateDebut, "yyyy-MM-dd"),
          date_fin: format(dateFin, "yyyy-MM-dd"),
          lieu: lieu || null,
          places_disponibles: parseInt(places) || 18,
          types_apprenant: typesApprenant,
          creneaux: creneaux,
          heure_debut: heureDebut || null,
          heure_fin: heureFin || null,
        })
        .eq('id', session.id);

      if (error) throw error;

      // Gérer le formateur assigné
      await supabase.from('session_formateurs').delete().eq('session_id', session.id);
      if (selectedFormateurId && selectedFormateurId !== "none") {
        await supabase.from('session_formateurs').insert({
          session_id: session.id,
          formateur_id: selectedFormateurId,
        });
      }

      toast({
        title: "Session mise à jour",
        description: "Les modifications ont été enregistrées.",
      });
      setOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNom(session.nom || "");
    setDateDebut(session.date_debut ? new Date(session.date_debut) : undefined);
    setDateFin(session.date_fin ? new Date(session.date_fin) : undefined);
    setLieu(session.lieu || "");
    setPlaces(String(session.places_disponibles || 18));
    setTypesApprenant(session.types_apprenant || []);
    setCreneaux(session.creneaux || []);
    setHeureDebut(session.heure_debut || "");
    setHeureFin(session.heure_fin || "");
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleOpen}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Modifier la session</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="sessionNom">Nom de la session</Label>
              <Input
                id="sessionNom"
                placeholder="Ex: Session Janvier 2026"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateDebut && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateDebut ? format(dateDebut, "dd MMM yyyy", { locale: fr }) : "Sélectionner"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateDebut}
                      onSelect={setDateDebut}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Date de fin *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFin && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFin ? format(dateFin, "dd MMM yyyy", { locale: fr }) : "Sélectionner"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFin}
                      onSelect={setDateFin}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lieu">Lieu</Label>
                <Input
                  id="lieu"
                  placeholder="86 route de genas 69003 Lyon"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="places">Places disponibles</Label>
                <Input
                  id="places"
                  type="number"
                  placeholder="18"
                  value={places}
                  onChange={(e) => setPlaces(e.target.value)}
                />
              </div>
            </div>

            {/* Types d'apprenant - Multi-sélection avec tags */}
            <div className="space-y-3">
              <Label>Types d'apprenant</Label>
              <div className="flex flex-wrap gap-2">
                {TYPES_APPRENANT.map((type) => (
                  <Badge
                    key={type.value}
                    variant={typesApprenant.includes(type.value) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all",
                      typesApprenant.includes(type.value) 
                        ? `${type.color} text-white hover:opacity-80` 
                        : "hover:bg-muted"
                    )}
                    onClick={() => toggleTypeApprenant(type.value)}
                  >
                    {type.label}
                    {typesApprenant.includes(type.value) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
              {typesApprenant.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {typesApprenant.length} type(s) sélectionné(s)
                </p>
              )}
            </div>

            {/* Horaires libres */}
            <div className="space-y-3">
              <Label>Horaires</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="heureDebut" className="text-xs text-muted-foreground">Heure de début</Label>
                  <Input
                    id="heureDebut"
                    type="time"
                    value={heureDebut}
                    onChange={(e) => setHeureDebut(e.target.value)}
                    placeholder="09:00"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="heureFin" className="text-xs text-muted-foreground">Heure de fin</Label>
                  <Input
                    id="heureFin"
                    type="time"
                    value={heureFin}
                    onChange={(e) => setHeureFin(e.target.value)}
                    placeholder="16:00"
                  />
                </div>
              </div>
            </div>

            {/* Créneaux horaires */}
            <div className="space-y-3">
              <Label>Créneaux horaires</Label>
              <div className="flex flex-wrap gap-4">
                {CRENEAUX.map((creneau) => (
                  <div key={creneau.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`creneau-${creneau.value}`}
                      checked={creneaux.includes(creneau.value)}
                      onCheckedChange={() => toggleCreneau(creneau.value)}
                    />
                    <label
                      htmlFor={`creneau-${creneau.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {creneau.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Sélection du formateur */}
            <div className="space-y-2">
              <Label>Formateur / Intervenant</Label>
              <Select value={selectedFormateurId} onValueChange={setSelectedFormateurId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un formateur..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {formateurs.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.prenom} {f.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
