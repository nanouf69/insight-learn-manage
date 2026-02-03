import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function PlanningForm() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Session planifiée",
      description: "La session a été ajoutée au planning.",
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
          <DialogTitle>Planifier une session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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

          <div className="space-y-2">
            <Label htmlFor="title">Titre de la session</Label>
            <Input id="title" placeholder="Ex: Module 3 - Hooks avancés" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Durée (heures)</Label>
              <Input id="duration" type="number" placeholder="3" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Heure de début</Label>
              <Input id="startTime" type="time" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Heure de fin</Label>
              <Input id="endTime" type="time" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie (couleur)</Label>
            <Select required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Développement (bleu)</SelectItem>
                <SelectItem value="accent">Design (violet)</SelectItem>
                <SelectItem value="success">Data (vert)</SelectItem>
                <SelectItem value="warning">Soft Skills (orange)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Planifier</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
