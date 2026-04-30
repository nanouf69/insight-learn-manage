import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type Organisation = {
  id: string;
  nom: string;
  siret: string | null;
  siret_complet?: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  numero_declaration: string | null;
  code_naf: string | null;
};

interface OrganisationFormProps {
  organisation?: Organisation | null;
  onClose?: () => void;
}

export function OrganisationForm({ organisation, onClose }: OrganisationFormProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = !!organisation;

  const [nom, setNom] = useState("");
  const [siret, setSiret] = useState("");
  const [siretComplet, setSiretComplet] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [numeroDeclaration, setNumeroDeclaration] = useState("");
  const [codeNaf, setCodeNaf] = useState("");

  useEffect(() => {
    if (organisation && open) {
      setNom(organisation.nom || "");
      setSiret(organisation.siret || "");
      setEmail(organisation.email || "");
      setTelephone(organisation.telephone || "");
      setAdresse(organisation.adresse || "");
      setCodePostal(organisation.code_postal || "");
      setVille(organisation.ville || "");
      setNumeroDeclaration(organisation.numero_declaration || "");
      setCodeNaf(organisation.code_naf || "");
    }
  }, [organisation, open]);

  const resetForm = () => {
    setNom(""); setSiret(""); setEmail(""); setTelephone("");
    setAdresse(""); setCodePostal(""); setVille("");
    setNumeroDeclaration(""); setCodeNaf("");
  };

  const handleClose = () => {
    setOpen(false);
    if (!isEdit) resetForm();
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = { nom, siret, email, telephone, adresse, code_postal: codePostal, ville, numero_declaration: numeroDeclaration, code_naf: codeNaf };

      if (isEdit && organisation) {
        const { error } = await supabase.from('organismes').update(payload).eq('id', organisation.id);
        if (error) throw error;
        toast({ title: "Organisation modifiée", description: `"${nom}" a été mise à jour.` });
      } else {
        const { error } = await supabase.from('organismes').insert(payload);
        if (error) throw error;
        toast({ title: "Organisation créée", description: `"${nom}" a été créée avec succès.` });
      }

      queryClient.invalidateQueries({ queryKey: ['organismes'] });
      handleClose();
      if (!isEdit) resetForm();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Erreur lors de l'opération", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
            <Pencil className="w-4 h-4" />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle organisation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'organisation" : "Nouvelle organisation"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'organisation</Label>
            <Input id="name" placeholder="Ex: OPCO Mobilités" required value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siret">N° SIREN</Label>
              <Input id="siret" placeholder="123 456 789" value={siret} onChange={(e) => setSiret(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codeNaf">Code NAF</Label>
              <Input id="codeNaf" placeholder="8559A" value={codeNaf} onChange={(e) => setCodeNaf(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numeroDeclaration">N° Déclaration</Label>
            <Input id="numeroDeclaration" placeholder="11 75 12345 75" value={numeroDeclaration} onChange={(e) => setNumeroDeclaration(e.target.value)} />
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
            <Input id="address" placeholder="15 Rue de l'Innovation" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codePostal">Code postal</Label>
              <Input id="codePostal" placeholder="75001" value={codePostal} onChange={(e) => setCodePostal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ville">Ville</Label>
              <Input id="ville" placeholder="Paris" value={ville} onChange={(e) => setVille(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer l'organisation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
