import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SessionForm() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Session créée",
      description: "La session a été créée avec succès.",
    });
    setOpen(false);
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
            <Label htmlFor="title">Titre de la session</Label>
            <Input id="title" placeholder="Ex: Session React Avancé - Groupe A" required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="formation">Formation</Label>
            <Select required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une formation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="react">React Avancé</SelectItem>
                <SelectItem value="ux">UX/UI Design</SelectItem>
                <SelectItem value="python">Python Data Science</SelectItem>
                <SelectItem value="management">Management d'équipe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horaire">Horaires</Label>
              <Input id="horaire" placeholder="09:00 - 17:00" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lieu">Lieu</Label>
              <Input id="lieu" placeholder="Salle A1 ou En ligne" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Participants max</Label>
              <Input id="maxParticipants" type="number" placeholder="15" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="formateur">Formateur</Label>
            <Select required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un formateur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jean">Jean Dupont</SelectItem>
                <SelectItem value="marie">Marie Martin</SelectItem>
                <SelectItem value="pierre">Pierre Bernard</SelectItem>
                <SelectItem value="sophie">Sophie Lefebvre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Créer la session</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
