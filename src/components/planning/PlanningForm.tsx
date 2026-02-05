import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function PlanningForm() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    formation: "",
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    category: "",
  });

  const resetForm = () => {
    setFormData({
      formation: "",
      title: "",
      date: "",
      startTime: "",
      endTime: "",
      category: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dateObj = new Date(formData.date);
      const jour = dateObj.getDay();
      
      const monday = new Date(dateObj);
      const dayOfWeek = dateObj.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      monday.setDate(dateObj.getDate() + diff);
      const semaineDebut = monday.toISOString().split('T')[0];

      const colorMap: Record<string, string> = {
        primary: "#3b82f6",
        accent: "#8b5cf6",
        success: "#22c55e",
        warning: "#f59e0b",
      };

      const { error } = await supabase.from("agenda_blocs").insert({
        formation: formData.formation,
        discipline_nom: formData.title,
        discipline_id: crypto.randomUUID(),
        discipline_color: colorMap[formData.category] || "#3b82f6",
        jour: jour,
        semaine_debut: semaineDebut,
        heure_debut: formData.startTime,
        heure_fin: formData.endTime,
      });

      if (error) throw error;

      toast.success("Session planifiée avec succès");
      queryClient.invalidateQueries({ queryKey: ["agenda_blocs"] });
      resetForm();
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la planification");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
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
            <Select value={formData.formation} onValueChange={(value) => setFormData({ ...formData, formation: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une formation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Formation TAXI et VTC">Formation TAXI et VTC</SelectItem>
                <SelectItem value="Formation TAXI">Formation TAXI</SelectItem>
                <SelectItem value="Formation VTC">Formation VTC</SelectItem>
                <SelectItem value="Formation TAXI et TA">Formation TAXI et TA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titre de la session</Label>
            <Input
              id="title"
              placeholder="Ex: Module 3 - Réglementation"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Heure de début</Label>
              <Input
                id="startTime"
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Jusqu'à</Label>
              <Input
                id="endTime"
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie (couleur)</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">TAXI/VTC (bleu)</SelectItem>
                <SelectItem value="accent">Anglais (violet)</SelectItem>
                <SelectItem value="success">Pratique (vert)</SelectItem>
                <SelectItem value="warning">Examen (orange)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Planifier
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
