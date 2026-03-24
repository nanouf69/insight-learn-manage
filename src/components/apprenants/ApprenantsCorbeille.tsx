import { useState } from "react";
import { Trash2, RotateCcw, AlertTriangle, Loader2, User, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ALL_MODULES } from "@/components/cours-en-ligne/modules-config";

const typeLabels: Record<string, string> = {
  vtc: "VTC", "vtc-e": "VTC E", taxi: "TAXI", "taxi-e": "TAXI E",
  ta: "TA", "ta-e": "TA E", va: "VA", "va-e": "VA E",
};

function getModuleName(moduleId: number): string {
  const mod = ALL_MODULES.find(m => m.id === moduleId);
  return mod ? mod.nom : `Module ${moduleId}`;
}

interface DeletedItem {
  moduleId: number;
  moduleName: string;
  type: "cours" | "exercice";
  item: any;
  index: number;
  updatedAt: string;
}

export function ApprenantsCorbeille() {
  const queryClient = useQueryClient();
  const [restoreDialog, setRestoreDialog] = useState<{ open: boolean; id: string | null; name: string }>({ open: false, id: null, name: "" });
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState<{ open: boolean; id: string | null; name: string }>({ open: false, id: null, name: "" });
  const [restoreItemDialog, setRestoreItemDialog] = useState<{ open: boolean; item: DeletedItem | null }>({ open: false, item: null });

  // ---- Apprenants supprimés ----
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

  // ---- Cours/Exercices supprimés ----
  const { data: deletedItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["corbeille-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_editor_state")
        .select("module_id, deleted_cours, deleted_exercices, updated_at");
      if (error) throw error;

      const items: DeletedItem[] = [];
      for (const row of (data || [])) {
        const deletedCours = (row.deleted_cours as any[]) || [];
        const deletedExercices = (row.deleted_exercices as any[]) || [];
        
        deletedCours.forEach((item: any, index: number) => {
          items.push({
            moduleId: row.module_id,
            moduleName: getModuleName(row.module_id),
            type: "cours",
            item,
            index,
            updatedAt: row.updated_at,
          });
        });

        deletedExercices.forEach((item: any, index: number) => {
          items.push({
            moduleId: row.module_id,
            moduleName: getModuleName(row.module_id),
            type: "exercice",
            item,
            index,
            updatedAt: row.updated_at,
          });
        });
      }
      return items;
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

  // Restore a deleted cours/exercice by removing it from the deleted array
  const restoreItemMutation = useMutation({
    mutationFn: async (deletedItem: DeletedItem) => {
      // Fetch current state
      const { data: rows, error: fetchError } = await supabase
        .from("module_editor_state")
        .select("id, deleted_cours, deleted_exercices, module_data")
        .eq("module_id", deletedItem.moduleId)
        .limit(1);
      if (fetchError) throw fetchError;
      if (!rows || rows.length === 0) throw new Error("Module non trouvé");

      const row = rows[0];
      const field = deletedItem.type === "cours" ? "deleted_cours" : "deleted_exercices";
      const currentDeleted = ((row as any)[field] as any[]) || [];

      // Remove the item from deleted array
      const updatedDeleted = currentDeleted.filter((_: any, i: number) => i !== deletedItem.index);

      const { error: updateError } = await supabase
        .from("module_editor_state")
        .update({ [field]: updatedDeleted } as any)
        .eq("id", row.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corbeille-questions"] });
      toast.success("Élément restauré avec succès");
      setRestoreItemDialog({ open: false, item: null });
    },
    onError: () => toast.error("Erreur lors de la restauration"),
  });

  const totalCorbeille = deletedApprenants.length + deletedItems.length;

  if (isLoading || isLoadingItems) {
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
          <p className="text-2xl font-bold">{totalCorbeille}</p>
          <p className="text-sm text-muted-foreground">Élément(s) dans la corbeille</p>
        </div>
      </div>

      <Tabs defaultValue="apprenants">
        <TabsList>
          <TabsTrigger value="apprenants" className="gap-2">
            <User className="w-4 h-4" />
            Apprenants ({deletedApprenants.length})
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Cours & Exercices ({deletedItems.length})
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB APPRENANTS ===== */}
        <TabsContent value="apprenants">
          {deletedApprenants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun apprenant supprimé</p>
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
        </TabsContent>

        {/* ===== TAB COURS & EXERCICES ===== */}
        <TabsContent value="questions">
          {deletedItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun cours ou exercice supprimé</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Titre</TableHead>
                    <TableHead className="font-semibold">Module</TableHead>
                    <TableHead className="w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedItems.map((di, idx) => (
                    <TableRow key={`${di.moduleId}-${di.type}-${di.index}-${idx}`} className="hover:bg-muted/50">
                      <TableCell>
                        <Badge variant={di.type === "cours" ? "secondary" : "outline"} className="text-xs">
                          {di.type === "cours" ? (
                            <><FileText className="w-3 h-3 mr-1" /> Cours</>
                          ) : (
                            <><BookOpen className="w-3 h-3 mr-1" /> Exercice</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{di.item.titre || di.item.enonce || "Sans titre"}</span>
                          {di.item.sousTitre && (
                            <p className="text-xs text-muted-foreground mt-0.5">{di.item.sousTitre}</p>
                          )}
                          {di.item.description && !di.item.sousTitre && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{di.item.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{di.moduleName}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRestoreItemDialog({ open: true, item: di })}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Restaurer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Restore apprenant dialog */}
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

      {/* Restore item dialog */}
      <AlertDialog open={restoreItemDialog.open} onOpenChange={(open) => setRestoreItemDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurer cet élément ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{restoreItemDialog.item?.item?.titre || "Cet élément"}</strong> sera restauré dans le module <strong>{restoreItemDialog.item?.moduleName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreItemDialog.item && restoreItemMutation.mutate(restoreItemDialog.item)}
              disabled={restoreItemMutation.isPending}
            >
              {restoreItemMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Restaurer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
