import { useState } from "react";
import { RotateCcw, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MODULES_DATA } from "@/components/cours-en-ligne/formations-data";

interface ResetCoursTabProps {
  apprenant: any;
  queryClient: QueryClient;
}

export function ResetCoursTab({ apprenant, queryClient }: ResetCoursTabProps) {
  const [resettingModule, setResettingModule] = useState<number | null>(null);
  const [resettingAll, setResettingAll] = useState(false);

  const modulesAutorises: number[] = apprenant.modules_autorises || [];

  // Fetch completions for this learner
  const { data: completions = [] } = useQuery({
    queryKey: ["reset-completions", apprenant.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("apprenant_module_completion")
        .select("module_id, score_obtenu, score_max")
        .eq("apprenant_id", apprenant.id);
      return data || [];
    },
  });

  // Fetch quiz results count per module
  const { data: quizResults = [] } = useQuery({
    queryKey: ["reset-quiz-results", apprenant.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("apprenant_quiz_results")
        .select("quiz_id, matiere_id")
        .eq("apprenant_id", apprenant.id);
      return data || [];
    },
  });

  const visibleModules = MODULES_DATA.filter(m => modulesAutorises.includes(m.id));

  const getModuleCompletion = (moduleId: number) => {
    return completions.find((c: any) => c.module_id === moduleId);
  };

  const resetModule = async (moduleId: number) => {
    const mod = MODULES_DATA.find(m => m.id === moduleId);
    const confirmed = window.confirm(
      `Remettre à zéro le module "${mod?.nom}" pour ${apprenant.prenom} ${apprenant.nom} ?`
    );
    if (!confirmed) return;

    setResettingModule(moduleId);
    try {
      const { error: err1 } = await supabase
        .from("apprenant_module_completion")
        .delete()
        .eq("apprenant_id", apprenant.id)
        .eq("module_id", moduleId);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from("apprenant_module_activites")
        .delete()
        .eq("apprenant_id", apprenant.id)
        .eq("module_id", moduleId);
      if (err2) throw err2;

      queryClient.invalidateQueries({ queryKey: ["reset-completions"] });
      queryClient.invalidateQueries({ queryKey: ["reset-quiz-results"] });
      toast.success(`Module "${mod?.nom}" remis à zéro`);
    } catch (error: any) {
      toast.error("Erreur : " + error.message);
    } finally {
      setResettingModule(null);
    }
  };

  const resetAll = async () => {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir remettre à zéro TOUS les cours de ${apprenant.prenom} ${apprenant.nom} ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    setResettingAll(true);
    try {
      const { error: err1 } = await supabase
        .from("apprenant_module_completion")
        .delete()
        .eq("apprenant_id", apprenant.id);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from("apprenant_quiz_results")
        .delete()
        .eq("apprenant_id", apprenant.id);
      if (err2) throw err2;

      const { error: err3 } = await supabase
        .from("apprenant_module_activites")
        .delete()
        .eq("apprenant_id", apprenant.id);
      if (err3) throw err3;

      queryClient.invalidateQueries({ queryKey: ["reset-completions"] });
      queryClient.invalidateQueries({ queryKey: ["reset-quiz-results"] });
      toast.success(`Tous les cours remis à zéro pour ${apprenant.prenom} ${apprenant.nom}`);
    } catch (error: any) {
      toast.error("Erreur : " + error.message);
    } finally {
      setResettingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <RotateCcw className="w-5 h-5" />
            Remise à zéro des modules
          </CardTitle>
          <Button
            variant="destructive"
            onClick={resetAll}
            disabled={resettingAll}
          >
            {resettingAll ? (
              <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="w-4 h-4 mr-2" />
            )}
            Tout remettre à zéro
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="text-center">Progression</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleModules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Aucun module autorisé pour cet apprenant
                  </TableCell>
                </TableRow>
              ) : (
                visibleModules.map((mod) => {
                  const completion = getModuleCompletion(mod.id);
                  const isCompleted = !!completion;
                  const score = completion
                    ? `${completion.score_obtenu ?? 0}/${completion.score_max ?? "?"}`
                    : "—";

                  return (
                    <TableRow key={mod.id}>
                      <TableCell className="font-medium text-primary">
                        {mod.nom}
                      </TableCell>
                      <TableCell className="text-center">
                        {isCompleted ? score : "0%"}
                      </TableCell>
                      <TableCell className="text-center">
                        {isCompleted ? (
                          <Badge variant="default" className="bg-green-600">Complété</Badge>
                        ) : (
                          <Badge variant="outline">Non fait</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!isCompleted || resettingModule === mod.id}
                          onClick={() => resetModule(mod.id)}
                        >
                          {resettingModule === mod.id ? (
                            <RotateCcw className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3 mr-1" />
                          )}
                          Supprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
