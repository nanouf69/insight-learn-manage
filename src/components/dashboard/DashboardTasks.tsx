import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Circle, Plus, Trash2, ListTodo, Calendar, Flame } from "lucide-react";
import { toast } from "sonner";

type Priorite = "urgente" | "haute" | "normale" | "basse";

interface Tache {
  id: string;
  titre: string;
  description: string | null;
  priorite: Priorite;
  echeance: string | null;
  terminee: boolean;
  terminee_at: string | null;
  terminee_par: string | null;
  cree_par: string | null;
  created_at: string;
}

const PRIORITE_ORDER: Record<Priorite, number> = { urgente: 0, haute: 1, normale: 2, basse: 3 };

const PRIORITE_CONFIG: Record<Priorite, { label: string; className: string }> = {
  urgente: { label: "🔥 Urgente", className: "bg-red-100 text-red-800 border-red-300" },
  haute: { label: "⬆️ Haute", className: "bg-orange-100 text-orange-800 border-orange-300" },
  normale: { label: "Normale", className: "bg-blue-100 text-blue-800 border-blue-300" },
  basse: { label: "Basse", className: "bg-muted text-muted-foreground" },
};

const fmtDate = (d?: string | null) => {
  if (!d) return null;
  const [y, m, j] = d.slice(0, 10).split("-");
  return `${j}/${m}/${y}`;
};

export function DashboardTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [priorite, setPriorite] = useState<Priorite>("normale");
  const [echeance, setEcheance] = useState("");

  const auteur = (user as any)?.user_metadata?.prenom || (user as any)?.email || "Équipe";

  const { data: taches = [], isLoading } = useQuery({
    queryKey: ["dashboard-taches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taches" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Tache[];
    },
    staleTime: 15_000,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("taches" as any).insert({
        titre: titre.trim(),
        description: description.trim() || null,
        priorite,
        echeance: echeance || null,
        cree_par: auteur,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-taches"] });
      toast.success("✅ Tâche ajoutée");
      setDialogOpen(false);
      setTitre(""); setDescription(""); setPriorite("normale"); setEcheance("");
    },
    onError: () => toast.error("Erreur lors de l'ajout de la tâche"),
  });

  const toggleMutation = useMutation({
    mutationFn: async (t: Tache) => {
      const { error } = await supabase
        .from("taches" as any)
        .update({
          terminee: !t.terminee,
          terminee_at: !t.terminee ? new Date().toISOString() : null,
          terminee_par: !t.terminee ? auteur : null,
        } as any)
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: (_d, t) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-taches"] });
      toast.success(t.terminee ? "Tâche rouverte" : "✅ Tâche terminée");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("taches" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-taches"] });
      toast.success("🗑️ Tâche supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const triees = [...taches].sort((a, b) => {
    if (a.terminee !== b.terminee) return a.terminee ? 1 : -1;
    if (PRIORITE_ORDER[a.priorite] !== PRIORITE_ORDER[b.priorite])
      return PRIORITE_ORDER[a.priorite] - PRIORITE_ORDER[b.priorite];
    return (a.echeance || "9999").localeCompare(b.echeance || "9999");
  });

  const enCours = triees.filter((t) => !t.terminee);
  const urgentes = enCours.filter((t) => t.priorite === "urgente").length;

  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ListTodo className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Tâches à faire</h2>
          {enCours.length > 0 && (
            <Badge variant="secondary">{enCours.length} en cours</Badge>
          )}
          {urgentes > 0 && (
            <Badge className="bg-red-100 text-red-800 border-red-300">
              <Flame className="w-3 h-3 mr-1" />{urgentes} urgente{urgentes > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1">
          <Plus className="w-4 h-4" /> Ajouter une tâche
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Chargement...</p>
      ) : triees.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucune tâche. Cliquez sur « Ajouter une tâche » pour en créer une.
        </p>
      ) : (
        <div className="space-y-2">
          {triees.map((t) => (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                t.terminee ? "bg-muted/40 border-border opacity-60" : "bg-card border-border"
              } ${!t.terminee && t.priorite === "urgente" ? "border-red-400 border-2" : ""}`}
            >
              <button
                onClick={() => toggleMutation.mutate(t)}
                className="mt-0.5 shrink-0"
                title={t.terminee ? "Rouvrir la tâche" : "Marquer comme faite"}
              >
                {t.terminee ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-medium ${t.terminee ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {t.titre}
                  </span>
                  <Badge variant="outline" className={PRIORITE_CONFIG[t.priorite]?.className}>
                    {PRIORITE_CONFIG[t.priorite]?.label}
                  </Badge>
                  {t.echeance && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" /> {fmtDate(t.echeance)}
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{t.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Ajoutée par {t.cree_par || "—"}
                  {t.terminee && t.terminee_par && ` · ✅ Faite par ${t.terminee_par} le ${fmtDate(t.terminee_at)}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                title="Supprimer la tâche"
                onClick={() => {
                  if (window.confirm(`Supprimer la tâche « ${t.titre} » ?`)) {
                    deleteMutation.mutate(t.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Titre de la tâche *"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
            />
            <Textarea
              placeholder="Description (optionnel)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select value={priorite} onValueChange={(v) => setPriorite(v as Priorite)}>
                <SelectTrigger>
                  <SelectValue placeholder="Priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgente">🔥 Urgente</SelectItem>
                  <SelectItem value="haute">⬆️ Haute</SelectItem>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="basse">Basse</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={echeance}
                onChange={(e) => setEcheance(e.target.value)}
                title="Date d'échéance"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button
              disabled={!titre.trim() || addMutation.isPending}
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
