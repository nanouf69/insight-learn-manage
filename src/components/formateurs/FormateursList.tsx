import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Mail, Phone, MapPin, Search, GraduationCap, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FormateurForm } from "./FormateurForm";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Formateur {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  specialites: string | null;
  tarif_horaire: number | null;
  type: string | null;
}

export function FormateursList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null; name: string }>({
    open: false,
    id: null,
    name: "",
  });
  const queryClient = useQueryClient();

  // Fetch formateurs from database
  const { data: formateurs = [], isLoading } = useQuery({
    queryKey: ['formateurs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formateurs')
        .select('*')
        .order('nom', { ascending: true });
      
      if (error) throw error;
      return data as Formateur[];
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('formateurs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formateurs'] });
      toast.success(`${deleteDialog.name} a été supprimé`);
      setDeleteDialog({ open: false, id: null, name: "" });
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    }
  });

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteDialog({ open: true, id, name });
  };

  const handleConfirmDelete = () => {
    if (deleteDialog.id) {
      deleteMutation.mutate(deleteDialog.id);
    }
  };

  const filteredFormateurs = formateurs.filter(f =>
    f.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.specialites && f.specialites.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const parseSpecialites = (specialites: string | null): string[] => {
    if (!specialites) return [];
    return specialites.split(',').map(s => s.trim()).filter(Boolean);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Formateurs</h1>
          <p className="text-muted-foreground">Gérez votre équipe de formateurs</p>
        </div>
        <FormateurForm />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{formateurs.length}</p>
            <p className="text-sm text-muted-foreground">Formateurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {formateurs.filter(f => f.type === 'interne').length}
            </p>
            <p className="text-sm text-muted-foreground">Internes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {formateurs.filter(f => f.type === 'externe').length}
            </p>
            <p className="text-sm text-muted-foreground">Externes</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un formateur ou une spécialité..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Formateurs List */}
      {filteredFormateurs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucun formateur trouvé</p>
          <p className="text-sm">Ajoutez votre premier formateur pour commencer</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredFormateurs.map((formateur) => (
            <Card key={formateur.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                  {/* Avatar & Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="w-14 h-14">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {formateur.prenom[0]}{formateur.nom[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg text-foreground">
                            {formateur.prenom} {formateur.nom}
                          </h3>
                          <Badge className={formateur.type === 'interne' 
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                          }>
                            {formateur.type === 'interne' ? 'Interne' : 'Externe'}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteClick(formateur.id, `${formateur.prenom} ${formateur.nom}`)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Coordonnées */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {formateur.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4" />
                            <span>{formateur.email}</span>
                          </div>
                        )}
                        {formateur.telephone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4" />
                            <span>{formateur.telephone}</span>
                          </div>
                        )}
                        {formateur.tarif_horaire && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>{formateur.tarif_horaire}€/h</span>
                          </div>
                        )}
                      </div>

                      {/* Spécialités */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {parseSpecialites(formateur.specialites).map((spec, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            <GraduationCap className="w-3 h-3 mr-1" />
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce formateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteDialog.name}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}