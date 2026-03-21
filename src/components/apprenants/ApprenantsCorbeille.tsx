import { useState } from "react";
import { Trash2, RotateCcw, AlertTriangle, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const typeLabels: Record<string, string> = {
  vtc: "VTC", "vtc-e": "VTC E", taxi: "TAXI", "taxi-e": "TAXI E",
  ta: "TA", "ta-e": "TA E", va: "VA", "va-e": "VA E",
};

export function ApprenantsCorbeille() {
  const queryClient = useQueryClient();
  const [restoreDialog, setRestoreDialog] = useState<{ open: boolean; id: string | null; name: string }>({ open: false, id: null, name: "" });
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState<{ open: boolean; id: string | null; name: string }>({ open: false, id: null, name: "" });

  const { data: deletedApprenants = [], isLoading } = useQuery({
    queryKey: ["apprenants-corbeille"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, email, telephone, type_apprenant, deleted_at, civilite" as any)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("apprenants")
        .update({ deleted_at: null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apprenants-corbeille"] });
      queryClient.invalidateQueries({ queryKey: ["apprenants"] });
      toast.success(`${restoreDialog.name} a été restauré`);
      setRestoreDialog({ open: false, id: null, name: "" });
    },
    onError: () => toast.error("Erreur lors de la restauration"),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("apprenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apprenants-corbeille"] });
      toast.success(`${permanentDeleteDialog.name} a été supprimé définitivement`);
      setPermanentDeleteDialog({ open: false, id: null, name: "" });
    },
    onError: () => toast.error("Erreur lors de la suppression définitive"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <p className="text-2xl font-bold">{deletedApprenants.length}</p>
          <p className="text-sm text-muted-foreground">Apprenant(s) dans la corbeille</p>
        </div>
      </div>

      {deletedApprenants.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>La corbeille est vide</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Apprenant</TableHead>
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold">Supprimé le</TableHead>
                <TableHead className="w-48"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deletedApprenants.map((a: any) => (
                <TableRow key={a.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-destructive/10 text-destructive">
                          {a.prenom?.[0]}{a.nom?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium">
                          {a.civilite && `${a.civilite} `}{a.prenom} {a.nom}
                        </span>
                        {a.type_apprenant && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {typeLabels[a.type_apprenant] || a.type_apprenant}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.email || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.deleted_at ? format(new Date(a.deleted_at), "dd/MM/yyyy HH:mm", { locale: fr }) : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreDialog({ open: true, id: a.id, name: `${a.prenom} ${a.nom}` })}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restaurer
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setPermanentDeleteDialog({ open: true, id: a.id, name: `${a.prenom} ${a.nom}` })}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Restore dialog */}
      <AlertDialog open={restoreDialog.open} onOpenChange={(open) => setRestoreDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurer cet apprenant ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{restoreDialog.name}</strong> sera restauré et réapparaîtra dans la liste des apprenants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => restoreDialog.id && restoreMutation.mutate(restoreDialog.id)} disabled={restoreMutation.isPending}>
              {restoreMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Restaurer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent delete dialog */}
      <AlertDialog open={permanentDeleteDialog.open} onOpenChange={(open) => setPermanentDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Suppression définitive
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement <strong>{permanentDeleteDialog.name}</strong> ? Cette action est <strong>irréversible</strong> et toutes les données associées seront perdues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => permanentDeleteDialog.id && permanentDeleteMutation.mutate(permanentDeleteDialog.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={permanentDeleteMutation.isPending}
            >
              {permanentDeleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
