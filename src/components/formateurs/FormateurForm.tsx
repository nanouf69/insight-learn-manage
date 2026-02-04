import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const specialites = [
  { id: "taxi-vtc", label: "Formation TAXI et VTC" },
  { id: "taxi", label: "Formation TAXI" },
  { id: "vtc", label: "Formation VTC" },
  { id: "taxi-ta", label: "Formation TAXI et TA" },
  { id: "anglais", label: "Cours Anglais" },
];

export function FormateurForm() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSpecialites, setSelectedSpecialites] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    tarif_horaire: "",
    type: "interne",
  });
  const queryClient = useQueryClient();

  const handleSpecialiteChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedSpecialites([...selectedSpecialites, id]);
    } else {
      setSelectedSpecialites(selectedSpecialites.filter(s => s !== id));
    }
  };

  const resetForm = () => {
    setFormData({
      prenom: "",
      nom: "",
      email: "",
      telephone: "",
      tarif_horaire: "",
      type: "interne",
    });
    setSelectedSpecialites([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Convert selected specialites to labels
      const specialitesLabels = selectedSpecialites
        .map(id => specialites.find(s => s.id === id)?.label)
        .filter(Boolean)
        .join(', ');

      const { error } = await supabase
        .from('formateurs')
        .insert({
          prenom: formData.prenom,
          nom: formData.nom,
          email: formData.email || null,
          telephone: formData.telephone || null,
          tarif_horaire: formData.tarif_horaire ? parseFloat(formData.tarif_horaire) : null,
          type: formData.type,
          specialites: specialitesLabels || null,
        });

      if (error) throw error;

      toast.success("Formateur créé avec succès");
      queryClient.invalidateQueries({ queryKey: ['formateurs'] });
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la création du formateur");
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
          Nouveau formateur
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau formateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom *</Label>
              <Input 
                id="prenom" 
                placeholder="Jean" 
                required 
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input 
                id="nom" 
                placeholder="Dupont" 
                required 
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="jean.dupont@ftransport.fr"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input 
                id="telephone" 
                placeholder="06 12 34 56 78"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tarif">Tarif horaire (€)</Label>
              <Input 
                id="tarif" 
                type="number" 
                placeholder="50"
                value={formData.tarif_horaire}
                onChange={(e) => setFormData({ ...formData, tarif_horaire: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interne">Interne</SelectItem>
                <SelectItem value="externe">Externe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Spécialités (formations dispensées)</Label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-3 border rounded-lg bg-muted/30">
              {specialites.map((spec) => (
                <div key={spec.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={spec.id} 
                    checked={selectedSpecialites.includes(spec.id)}
                    onCheckedChange={(checked) => handleSpecialiteChange(spec.id, checked as boolean)}
                  />
                  <label
                    htmlFor={spec.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {spec.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer le formateur
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}