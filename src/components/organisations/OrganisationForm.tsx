import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function OrganisationForm() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // États pour les champs
  const [nom, setNom] = useState("");
  const [siret, setSiret] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");

  const resetForm = () => {
    setNom("");
    setSiret("");
    setEmail("");
    setTelephone("");
    setAdresse("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('organismes')
        .insert({
          nom,
          siret,
          email,
          telephone,
          adresse,
        });

      if (error) throw error;

      toast({
        title: "Organisation créée",
        description: `L'organisation "${nom}" a été créée avec succès.`,
      });
      resetForm();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création de l'organisation",
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
          Nouvelle organisation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouvelle organisation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'organisation</Label>
            <Input id="name" placeholder="Ex: OPCO Mobilités" required value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siret">SIRET</Label>
            <Input id="siret" placeholder="123 456 789 00012" value={siret} onChange={(e) => setSiret(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="contact@entreprise.fr" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" type="tel" placeholder="01 23 45 67 89" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" placeholder="15 Rue de l'Innovation, 75001 Paris" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer l'organisation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
