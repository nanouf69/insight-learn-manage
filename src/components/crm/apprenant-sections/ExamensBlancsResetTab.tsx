import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
import { RotateCcw, Trophy, Calendar, Hash, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ExamensBlancsResetTabProps {
  apprenant: {
    id: string;
    nom: string;
    prenom: string;
  };
}

interface ExamenResult {
  quiz_id: string;
  matiere_id: string;
  matiere_nom: string;
  score_obtenu: number;
  score_max: number;
  completed_at: string;
}

interface ExamenGroup {
  examenNum: number;
  examenLabel: string;
  type: string; // vtc, taxi, ta, va
  results: ExamenResult[];
  totalScore: number;
  totalMax: number;
  lastDate: string;
}

function parseExamenInfo(quizId: string): { num: number; type: string } {
  const lower = quizId.toLowerCase();
  // Formats: "EB1", "eb3-vtc", "eb4-taxi", "eb1-ta", "eb2-va"
  const match = lower.match(/eb(\d+)(?:-(vtc|taxi|ta|va))?/);
  if (!match) return { num: 0, type: "vtc" };
  return { num: parseInt(match[1]), type: match[2] || "vtc" };
}

function typeLabel(type: string): string {
  switch (type) {
    case "vtc": return "VTC";
    case "taxi": return "TAXI";
    case "ta": return "TA";
    case "va": return "VA";
    default: return type.toUpperCase();
  }
}

export default function ExamensBlancsResetTab({ apprenant }: ExamensBlancsResetTabProps) {
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<{ group: ExamenGroup; matiere?: ExamenResult } | null>(null);
  const [resetting, setResetting] = useState(false);
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

  const { data: examGroups = [], isLoading } = useQuery({
    queryKey: ["examen-blanc-results-admin", apprenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apprenant_quiz_results")
        .select("*")
        .eq("apprenant_id", apprenant.id)
        .eq("quiz_type", "examen_blanc");

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const grouped = new Map<string, ExamenGroup>();
      for (const row of data) {
        const { num, type } = parseExamenInfo(row.quiz_id);
        const key = `${num}-${type}`;
        const existing = grouped.get(key);
        const result: ExamenResult = {
          quiz_id: row.quiz_id,
          matiere_id: row.matiere_id ?? "unknown",
          matiere_nom: row.matiere_nom ?? "Matière inconnue",
          score_obtenu: row.score_obtenu ?? 0,
          score_max: row.score_max ?? 20,
          completed_at: row.completed_at,
        };

        if (existing) {
          existing.results.push(result);
          existing.totalScore += result.score_obtenu;
          existing.totalMax += result.score_max;
          if (result.completed_at > existing.lastDate) {
            existing.lastDate = result.completed_at;
          }
        } else {
          grouped.set(key, {
            examenNum: num,
            examenLabel: `Examen Blanc ${num} — ${typeLabel(type)}`,
            type,
            results: [result],
            totalScore: result.score_obtenu,
            totalMax: result.score_max,
            lastDate: result.completed_at,
          });
        }
      }

      return Array.from(grouped.values()).sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.examenNum - b.examenNum;
      });
    },
    enabled: !!apprenant.id,
  });

  const toggleExpand = (key: string) => {
    setExpandedExams((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleReset = async (group: ExamenGroup, matiere?: ExamenResult) => {
    setResetting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Session expirée"); return; }

      if (matiere) {
        // Reset single matière — quiz_results + reponses
        const exerciceId = `${matiere.quiz_id}_${matiere.matiere_id}`;

        const { error } = await supabase
          .from("apprenant_quiz_results")
          .delete()
          .eq("apprenant_id", apprenant.id)
          .eq("quiz_type", "examen_blanc")
          .eq("quiz_id", matiere.quiz_id)
          .eq("matiere_id", matiere.matiere_id);
        if (error) throw error;

        // Also delete matching reponses_apprenants
        await supabase
          .from("reponses_apprenants")
          .delete()
          .eq("apprenant_id", apprenant.id)
          .eq("exercice_id", exerciceId);

        await supabase.from("audit_logs").insert({
          action: "reset_examen_blanc_matiere",
          admin_user_id: user.id,
          admin_email: user.email ?? null,
          apprenant_id: apprenant.id,
          apprenant_nom: `${apprenant.prenom} ${apprenant.nom}`,
          details: {
            examen_label: group.examenLabel,
            matiere_id: matiere.matiere_id,
            matiere_nom: matiere.matiere_nom,
            quiz_id: matiere.quiz_id,
            exercice_id: exerciceId,
          },
        });

        toast.success(`${matiere.matiere_nom} réinitialisée (${group.examenLabel})`);
      } else {
        // Reset full exam — quiz_results + all reponses for each matière
        const quizIds = [...new Set(group.results.map((r) => r.quiz_id))];

        for (const qid of quizIds) {
          const { error } = await supabase
            .from("apprenant_quiz_results")
            .delete()
            .eq("apprenant_id", apprenant.id)
            .eq("quiz_type", "examen_blanc")
            .eq("quiz_id", qid);
          if (error) throw error;
        }

        // Delete all reponses for each matière of this exam
        const exerciceIds = group.results.map((r) => `${r.quiz_id}_${r.matiere_id}`);
        for (const eid of exerciceIds) {
          await supabase
            .from("reponses_apprenants")
            .delete()
            .eq("apprenant_id", apprenant.id)
            .eq("exercice_id", eid);
        }

        await supabase.from("audit_logs").insert({
          action: "reset_examen_blanc",
          admin_user_id: user.id,
          admin_email: user.email ?? null,
          apprenant_id: apprenant.id,
          apprenant_nom: `${apprenant.prenom} ${apprenant.nom}`,
          details: {
            examen_label: group.examenLabel,
            examen_num: group.examenNum,
            type: group.type,
            quiz_ids: quizIds,
            exercice_ids: exerciceIds,
            matieres_supprimees: group.results.length,
          },
        });

        toast.success(`${group.examenLabel} réinitialisé pour ${apprenant.prenom} ${apprenant.nom}`);
      }

      queryClient.invalidateQueries({ queryKey: ["examen-blanc-results-admin", apprenant.id] });
    } catch (err: any) {
      console.error("Erreur reset examen blanc:", err);
      toast.error(err?.message || "Erreur lors de la réinitialisation");
    } finally {
      setResetting(false);
      setConfirmTarget(null);
    }
  };

  const confirmLabel = confirmTarget?.matiere
    ? confirmTarget.matiere.matiere_nom
    : confirmTarget?.group.examenLabel;

  const confirmDescription = confirmTarget?.matiere
    ? `la matière "${confirmTarget.matiere.matiere_nom}" de l'${confirmTarget.group.examenLabel}`
    : `toutes les ${confirmTarget?.group.results.length} matières de l'${confirmTarget?.group.examenLabel}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Examens blancs — Remise à zéro
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Réinitialisez les résultats d'examen blanc de <strong>{apprenant.prenom} {apprenant.nom}</strong> par examen ou par matière.
          L'action est tracée pour la conformité Qualiopi.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : examGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Aucun résultat d'examen blanc trouvé pour cet apprenant.
          </p>
        ) : (
          <div className="space-y-3">
            {examGroups.map((group) => {
              const key = `${group.examenNum}-${group.type}`;
              const expanded = expandedExams.has(key);
              const noteGlobale = group.totalMax > 0
                ? ((group.totalScore / group.totalMax) * 20).toFixed(1)
                : "0";

              return (
                <div key={key} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-muted/30">
                    <div
                      className="flex-1 cursor-pointer flex items-center gap-2"
                      onClick={() => toggleExpand(key)}
                    >
                      {expanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{group.examenLabel}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            Note : {noteGlobale}/20
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {group.results.length} matière{group.results.length > 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(group.lastDate), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmTarget({ group })}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Remettre à zéro
                    </Button>
                  </div>

                  {expanded && (
                    <div className="border-t divide-y">
                      {group.results
                        .sort((a, b) => a.matiere_nom.localeCompare(b.matiere_nom))
                        .map((r, i) => {
                          const note = r.score_max > 0
                            ? ((r.score_obtenu / r.score_max) * 20).toFixed(1)
                            : "0";
                          return (
                            <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{r.matiere_nom}</span>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs">{note}/20</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                  onClick={() => setConfirmTarget({ group, matiere: r })}
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  Reset
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la remise à zéro</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment réinitialiser <strong>{confirmDescription}</strong> pour{" "}
              <strong>{apprenant.prenom} {apprenant.nom}</strong> ?
              <br /><br />
              Cette action est <strong>irréversible</strong>.
              {confirmTarget?.matiere
                ? " Le résultat de cette matière sera supprimé et l'apprenant pourra la refaire."
                : ` Les résultats des ${confirmTarget?.group.results.length} matière(s) seront supprimés et l'apprenant pourra refaire cet examen depuis zéro.`}
              <br /><br />
              <em className="text-xs">L'action sera enregistrée dans le journal d'audit (traçabilité Qualiopi/MCF).</em>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmTarget && handleReset(confirmTarget.group, confirmTarget.matiere)}
              disabled={resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-1" />
              )}
              Confirmer la remise à zéro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}