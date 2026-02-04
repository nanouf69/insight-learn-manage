import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const specialites = [
  { id: "taxi-vtc", label: "Formation TAXI et VTC" },
  { id: "taxi", label: "Formation TAXI" },
  { id: "vtc", label: "Formation VTC" },
  { id: "taxi-ta", label: "Formation TAXI et TA" },
  { id: "anglais", label: "Cours Anglais" },
];

export function FormateurForm() {
  const [open, setOpen] = useState(false);
  const [selectedSpecialites, setSelectedSpecialites] = useState<string[]>([]);
  const { toast } = useToast();

  const handleSpecialiteChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedSpecialites([...selectedSpecialites, id]);
    } else {
      setSelectedSpecialites(selectedSpecialites.filter(s => s !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Formateur créé",
      description: "Le formateur a été ajouté avec succès.",
    });
    setOpen(false);
    setSelectedSpecialites([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <Label htmlFor="prenom">Prénom</Label>
              <Input id="prenom" placeholder="Jean" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" placeholder="Dupont" required />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="jean.dupont@ftransport.fr" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input id="telephone" placeholder="06 12 34 56 78" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input id="adresse" placeholder="15 rue de la Formation" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codePostal">Code postal</Label>
              <Input id="codePostal" placeholder="75001" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ville">Ville</Label>
              <Input id="ville" placeholder="Paris" required />
            </div>
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
            <Button type="submit">Créer le formateur</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}