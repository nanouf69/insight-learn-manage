import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, User, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Liste des formations disponibles (TAXI/VTC)
const formationsDisponibles = [
  { id: "vtc", nom: "Formation VTC", prix: 1099 },
  { id: "vtc-exam", nom: "Formation VTC avec frais d'examen", prix: 1599 },
  { id: "taxi", nom: "Formation TAXI", prix: 1299 },
  { id: "taxi-exam", nom: "Formation TAXI avec frais d'examen", prix: 1799 },
  { id: "passerelle-taxi", nom: "Formation TAXI pour chauffeur VTC", prix: 999 },
  { id: "vtc-elearning", nom: "Formation VTC (E-learning)", prix: 1599 },
  { id: "taxi-elearning", nom: "Formation TAXI (E-learning)", prix: 1299 },
  { id: "passerelle-taxi-elearning", nom: "Formation TAXI pour chauffeur VTC (E-learning)", prix: 499 },
  { id: "passerelle-vtc-elearning", nom: "Formation VTC pour chauffeur TAXI (E-learning)", prix: 499 },
];

export function ApprenantForm() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [typeApprenant, setTypeApprenant] = useState<"prospect" | "client">("prospect");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Apprenant ajouté",
      description: `L'apprenant a été ajouté en tant que ${typeApprenant === "prospect" ? "prospect" : "client"}.`,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un apprenant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvel apprenant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Type : Prospect ou Client */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Type</Label>
            <RadioGroup 
              value={typeApprenant} 
              onValueChange={(v) => setTypeApprenant(v as "prospect" | "client")}
              className="grid grid-cols-2 gap-4"
            >
              <div 
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  typeApprenant === "prospect" 
                    ? "border-amber-500 bg-amber-50" 
                    : "border-border hover:border-amber-300"
                }`}
                onClick={() => setTypeApprenant("prospect")}
              >
                <RadioGroupItem value="prospect" id="prospect" />
                <Label htmlFor="prospect" className="flex items-center gap-2 cursor-pointer flex-1">
                  <User className="w-5 h-5 text-amber-600" />
                  <div>
                    <div className="font-medium">Prospect</div>
                    <div className="text-xs text-muted-foreground">Personne intéressée, pas encore inscrite</div>
                  </div>
                </Label>
              </div>
              <div 
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  typeApprenant === "client" 
                    ? "border-green-500 bg-green-50" 
                    : "border-border hover:border-green-300"
                }`}
                onClick={() => setTypeApprenant("client")}
              >
                <RadioGroupItem value="client" id="client" />
                <Label htmlFor="client" className="flex items-center gap-2 cursor-pointer flex-1">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium">Client</div>
                    <div className="text-xs text-muted-foreground">Personne inscrite à une formation</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Identité */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Identité</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input id="firstName" placeholder="Jean" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input id="lastName" placeholder="Martin" required />
              </div>
            </div>
          </div>

          {/* Coordonnées */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Coordonnées</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="jean.martin@email.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" type="tel" placeholder="06 12 34 56 78" />
              </div>
            </div>
          </div>

          {/* Adresse postale */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Adresse postale</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input id="adresse" placeholder="12 rue des Lilas" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codePostal">Code postal</Label>
                  <Input id="codePostal" placeholder="69001" maxLength={5} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input id="ville" placeholder="Lyon" />
                </div>
              </div>
            </div>
          </div>

          {/* Formation */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Formation</h3>
            <div className="space-y-2">
              <Label htmlFor="formation">Formation souhaitée {typeApprenant === "client" && "*"}</Label>
              <Select required={typeApprenant === "client"}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une formation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Formations Présentiel</SelectLabel>
                    <SelectItem value="vtc">Formation VTC - 1 099 €</SelectItem>
                    <SelectItem value="vtc-exam">Formation VTC avec frais d'examen - 1 599 €</SelectItem>
                    <SelectItem value="taxi">Formation TAXI - 1 299 €</SelectItem>
                    <SelectItem value="taxi-exam">Formation TAXI avec frais d'examen - 1 799 €</SelectItem>
                    <SelectItem value="passerelle-taxi">Formation TAXI pour chauffeur VTC - 999 €</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Formations E-learning</SelectLabel>
                    <SelectItem value="vtc-elearning">Formation VTC (E-learning) - 1 599 €</SelectItem>
                    <SelectItem value="taxi-elearning">Formation TAXI (E-learning) - 1 299 €</SelectItem>
                    <SelectItem value="passerelle-taxi-elearning">Formation TAXI pour chauffeur VTC (E-learning) - 499 €</SelectItem>
                    <SelectItem value="passerelle-vtc-elearning">Formation VTC pour chauffeur TAXI (E-learning) - 499 €</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {typeApprenant === "client" && (
              <div className="space-y-2">
                <Label htmlFor="status">Statut de formation</Label>
                <Select defaultValue="inscrit">
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inscrit">Inscrit</SelectItem>
                    <SelectItem value="en_cours">En cours de formation</SelectItem>
                    <SelectItem value="termine">Formation terminée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Mode de financement */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Financement</h3>
            <div className="space-y-2">
              <Label htmlFor="financement">Mode de financement *</Label>
              <Select defaultValue="personnel">
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un mode de financement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      CPF (Mon Compte Formation)
                    </span>
                  </SelectItem>
                  <SelectItem value="personnel">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-500" />
                      Personnel (auto-financement)
                    </span>
                  </SelectItem>
                  <SelectItem value="opco">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      OPCO
                    </span>
                  </SelectItem>
                  <SelectItem value="france_travail">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      France Travail
                    </span>
                  </SelectItem>
                  <SelectItem value="autre">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      Autre
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Entreprise / Organisme financeur (optionnel)</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une entreprise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opco-mobilites">OPCO Mobilités</SelectItem>
                  <SelectItem value="opco-ep">OPCO EP</SelectItem>
                  <SelectItem value="fafcea">FAFCEA</SelectItem>
                  <SelectItem value="entreprise">Entreprise directe</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" placeholder="Informations complémentaires..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {typeApprenant === "prospect" ? "Ajouter le prospect" : "Ajouter le client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
