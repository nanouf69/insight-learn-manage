import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function FormationForm() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // États pour les champs
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [duree, setDuree] = useState("");
  const [prix, setPrix] = useState("");
  const [tvaTaux, setTvaTaux] = useState("0");

  const resetForm = () => {
    setNom("");
    setDescription("");
    setDuree("");
    setPrix("");
    setTvaTaux("0");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('formations')
        .insert({
          nom,
          description,
          duree_heures: parseInt(duree) || 0,
          prix_ht: parseFloat(prix) || 0,
          tva_taux: parseFloat(tvaTaux) || 0,
        });

      if (error) throw error;

      toast({
        title: "Formation créée",
        description: `La formation "${nom}" a été créée avec succès.`,
      });
      resetForm();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création de la formation",
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
            <Input id="title" placeholder="Ex: Formation VTC" required value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Décrivez le contenu de la formation..." 
              className="min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tva">TVA</Label>
              <Select value={tvaTaux} onValueChange={setTvaTaux}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner TVA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Exonéré (0%)</SelectItem>
                  <SelectItem value="5.5">5,5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Durée (heures)</Label>
              <Input id="duration" type="number" placeholder="140" required value={duree} onChange={(e) => setDuree(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Prix HT (€)</Label>
            <Input id="price" type="number" placeholder="1800" required value={prix} onChange={(e) => setPrix(e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer la formation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
