import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function FormationForm() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Formation créée",
      description: "La formation a été créée avec succès.",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle formation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Nouvelle formation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre de la formation</Label>
            <Input id="title" placeholder="Ex: React Avancé" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Décrivez le contenu de la formation..." 
              className="min-h-[80px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="formation-type">Type de formation</Label>
            <Select required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une formation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="taxi-presentiel">Formation Taxi (Présentiel)</SelectItem>
                <SelectItem value="vtc-presentiel">Formation VTC (Présentiel)</SelectItem>
                <SelectItem value="taxi-examen-presentiel">Formation Taxi avec frais d'examen (Présentiel)</SelectItem>
                <SelectItem value="vtc-examen-presentiel">Formation VTC avec frais d'examen (Présentiel)</SelectItem>
                <SelectItem value="taxi-pour-vtc-presentiel">Formation Taxi pour chauffeur VTC (Présentiel)</SelectItem>
                <SelectItem value="vtc-elearning">Formation VTC (E-learning)</SelectItem>
                <SelectItem value="taxi-elearning">Formation Taxi (E-learning)</SelectItem>
                <SelectItem value="taxi-pour-vtc-elearning">Formation Taxi pour chauffeur VTC (E-learning)</SelectItem>
                <SelectItem value="vtc-pour-taxi-elearning">Formation VTC pour chauffeur Taxi (E-learning)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Modalité</Label>
              <Select required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presentiel">Présentiel</SelectItem>
                  <SelectItem value="elearning">E-learning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Durée (heures)</Label>
              <Input id="duration" type="number" placeholder="140" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Prix (€)</Label>
              <Input id="price" type="number" placeholder="1800" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">URL de l'image</Label>
            <Input id="image" type="url" placeholder="https://..." />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Créer la formation</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
