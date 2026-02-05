import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pencil, Loader2, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SessionEditorProps {
  session: {
    id: string;
    nom: string | null;
    date_debut: string;
    date_fin: string;
    lieu: string | null;
    places_disponibles: number | null;
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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
        })
        .eq('id', session.id);

      if (error) throw error;

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
        <DialogContent className="sm:max-w-[500px]" onClick={(e) => e.stopPropagation()}>
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
