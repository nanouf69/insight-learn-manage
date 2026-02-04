import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Apprenant {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  civilite: string | null;
  statut: string | null;
  mode_financement: string | null;
  date_naissance: string | null;
  numero_dossier_cma: string | null;
}

interface ApprenantEditFormProps {
  apprenant: Apprenant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApprenantEditForm({ apprenant, open, onOpenChange }: ApprenantEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    civilite: "",
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    adresse: "",
    code_postal: "",
    ville: "",
    statut: "particulier",
    mode_financement: "personnel",
    date_naissance: "",
    numero_dossier_cma: "",
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (apprenant) {
      setFormData({
        civilite: apprenant.civilite || "",
        prenom: apprenant.prenom,
        nom: apprenant.nom,
        email: apprenant.email || "",
        telephone: apprenant.telephone || "",
        adresse: apprenant.adresse || "",
        code_postal: apprenant.code_postal || "",
        ville: apprenant.ville || "",
        statut: apprenant.statut || "particulier",
        mode_financement: apprenant.mode_financement || "personnel",
        date_naissance: apprenant.date_naissance || "",
        numero_dossier_cma: apprenant.numero_dossier_cma || "",
      });
    }
  }, [apprenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('apprenants')
        .update({
          civilite: formData.civilite || null,
          prenom: formData.prenom,
          nom: formData.nom,
          email: formData.email || null,
          telephone: formData.telephone || null,
          adresse: formData.adresse || null,
          code_postal: formData.code_postal || null,
          ville: formData.ville || null,
          statut: formData.statut,
          mode_financement: formData.mode_financement,
          date_naissance: formData.date_naissance || null,
          numero_dossier_cma: formData.numero_dossier_cma || null,
        })
        .eq('id', apprenant.id);

      if (error) throw error;

      toast.success("Apprenant modifié avec succès");
      queryClient.invalidateQueries({ queryKey: ['apprenants'] });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la modification de l'apprenant");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'apprenant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Identité */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Identité</h3>
            <div className="space-y-2">
              <Label htmlFor="civilite">Civilité</Label>
              <Select value={formData.civilite} onValueChange={(value) => setFormData({ ...formData, civilite: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une civilité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M.">M.</SelectItem>
                  <SelectItem value="Mme">Mme</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                  placeholder="Martin" 
                  required 
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_naissance">Date de naissance</Label>
              <Input 
                id="date_naissance" 
                type="date"
                value={formData.date_naissance}
                onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
              />
            </div>
          </div>

          {/* Coordonnées */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Coordonnées</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="jean.martin@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input 
                  id="telephone" 
                  type="tel" 
                  placeholder="06 12 34 56 78"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Adresse postale */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Adresse postale</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input 
                  id="adresse" 
                  placeholder="12 rue des Lilas"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code_postal">Code postal</Label>
                  <Input 
                    id="code_postal" 
                    placeholder="69001" 
                    maxLength={5}
                    value={formData.code_postal}
                    onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input 
                    id="ville" 
                    placeholder="Lyon"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Statut et Financement */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Statut et Financement</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="statut">Statut</Label>
                <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particulier">Particulier</SelectItem>
                    <SelectItem value="entreprise">Entreprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mode_financement">Mode de financement</Label>
                <Select value={formData.mode_financement} onValueChange={(value) => setFormData({ ...formData, mode_financement: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="personnel">Personnel</SelectItem>
                    <SelectItem value="opco">OPCO</SelectItem>
                    <SelectItem value="france_travail">France Travail</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_dossier_cma">Numéro de dossier CMA</Label>
              <Input 
                id="numero_dossier_cma" 
                placeholder="CMA-2024-001"
                value={formData.numero_dossier_cma}
                onChange={(e) => setFormData({ ...formData, numero_dossier_cma: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
