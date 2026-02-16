import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function SessionForm() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [nom, setNom] = useState("");
  const [typeSession, setTypeSession] = useState("theorique");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [lieu, setLieu] = useState("");
  const [places, setPlaces] = useState("18");

  const resetForm = () => {
    setNom("");
    setTypeSession("theorique");
    setDateDebut("");
    setDateFin("");
    setLieu("");
    setPlaces("18");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('sessions')
        .insert({
          nom: nom || null,
          type_session: typeSession,
          date_debut: dateDebut,
          date_fin: dateFin,
          lieu,
          places_disponibles: parseInt(places) || (typeSession === 'pratique' ? 4 : 18),
          statut: 'planifiee',
        });

      if (error) throw error;

      toast({
        title: "Session créée",
        description: "La session a été créée avec succès.",
      });
      resetForm();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création de la session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouvelle session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Type de session *</Label>
            <Select value={typeSession} onValueChange={(v) => {
              setTypeSession(v);
              if (v === 'pratique') setPlaces("4");
              else setPlaces("18");
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="theorique">📚 Formation théorique</SelectItem>
                <SelectItem value="pratique">🚗 Formation pratique</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nom">Nom de la session</Label>
            <Input id="nom" placeholder={typeSession === 'pratique' ? "Ex: Formation pratique VTC Février 2026" : "Ex: Session Janvier 2026"} value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Date de début *</Label>
              <Input id="dateDebut" type="date" required value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFin">Date de fin *</Label>
              <Input id="dateFin" type="date" required value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lieu">Lieu</Label>
              <Input id="lieu" placeholder="86 route de genas 69003 Lyon" value={lieu} onChange={(e) => setLieu(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="places">Places disponibles</Label>
              <Input id="places" type="number" placeholder={typeSession === 'pratique' ? "4" : "18"} value={places} onChange={(e) => setPlaces(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer la session
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
