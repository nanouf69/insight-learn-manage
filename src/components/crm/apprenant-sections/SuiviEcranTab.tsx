import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, ListChecks, Target, Loader2 } from "lucide-react";
import { MODULE_NAME_BY_ID } from "@/components/cours-en-ligne/modules-config";

interface Props {
  apprenantId: string;
}

interface ModuleStat {
  moduleId: number;
  nom: string;
  questionsTraitees: number;
  questionsTotal: number;
  scorePct: number | null;
  tempsTotalSec: number;
  questionsChronometrees: number;
}

function formatDuree(sec: number) {
  if (!sec || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
  if (m > 0) return `${m} min ${String(s).padStart(2, "0")} s`;
  return `${s} s`;
}

export function SuiviEcranTab({ apprenantId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["suivi-ecran-apprenant", apprenantId],
    enabled: !!apprenantId,
    staleTime: 60_000,
    queryFn: async () => {
      const [temps, completions] = await Promise.all([
        fetchAllRows<any>((from, to) =>
          supabase
            .from("apprenant_question_temps" as any)
            .select("module_id, module_nom, question_key, seconds, answered, occurred_at")
            .eq("apprenant_id", apprenantId)
            .range(from, to),
        ).catch(() => [] as any[]),
        fetchAllRows<any>((from, to) =>
          supabase
            .from("apprenant_module_completion")
            .select("module_id, score_obtenu, score_max, progress, details, status")
            .eq("apprenant_id", apprenantId)
            .range(from, to),
        ).catch(() => [] as any[]),
      ]);

      const tempsParModule = new Map<number, { sec: number; nb: number; nom?: string }>();
      let tempsTotal = 0;
      let nbMesures = 0;
      for (const t of temps as any[]) {
        const sec = Number(t.seconds) || 0;
        tempsTotal += sec;
        nbMesures += 1;
        const mid = Number(t.module_id);
        if (!Number.isFinite(mid)) continue;
        const cur = tempsParModule.get(mid) || { sec: 0, nb: 0, nom: t.module_nom };
        cur.sec += sec;
        cur.nb += 1;
        if (!cur.nom && t.module_nom) cur.nom = t.module_nom;
        tempsParModule.set(mid, cur);
      }

      const modules: ModuleStat[] = [];
      let totalTraitees = 0;
      let totalQuestions = 0;
      const scores: number[] = [];

      const moduleIds = new Set<number>([
        ...(completions as any[]).map((c: any) => Number(c.module_id)),
        ...tempsParModule.keys(),
      ]);

      for (const mid of moduleIds) {
        if (!Number.isFinite(mid)) continue;
        const c = (completions as any[]).find((r: any) => Number(r.module_id) === mid);
        const details = Array.isArray(c?.details) ? (c!.details as any[]) : [];
        const questionsTotal = details.length || Number(c?.score_max) || 0;
        const questionsTraitees = details.length
          ? details.filter((d: any) => {
              const r = d?.reponseEleve;
              return Array.isArray(r) ? r.length > 0 : !!r;
            }).length
          : 0;
        const scoreMax = Number(c?.score_max) || 0;
        const scorePct = scoreMax > 0 ? Math.round(((Number(c?.score_obtenu) || 0) / scoreMax) * 100) : null;
        const tp = tempsParModule.get(mid);

        totalTraitees += questionsTraitees;
        totalQuestions += questionsTotal;
        if (scorePct !== null) scores.push(scorePct);

        modules.push({
          moduleId: mid,
          nom: MODULE_NAME_BY_ID[mid] || tp?.nom || `Module ${mid}`,
          questionsTraitees,
          questionsTotal,
          scorePct,
          tempsTotalSec: tp?.sec || 0,
          questionsChronometrees: tp?.nb || 0,
        });
      }

      modules.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

      return {
        tempsMoyenParQuestion: nbMesures > 0 ? tempsTotal / nbMesures : 0,
        tempsTotal,
        nbMesures,
        tauxReponses: totalQuestions > 0 ? Math.round((totalTraitees / totalQuestions) * 100) : 0,
        totalTraitees,
        totalQuestions,
        scoreMoyen: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        modules,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Chargement du suivi…
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Temps moyen par question
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.nbMesures > 0 ? `${Math.round(data.tempsMoyenParQuestion)} s` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.nbMesures > 0
                ? `${data.nbMesures} questions mesurées · ${formatDuree(data.tempsTotal)} au total`
                : "Aucune mesure enregistrée pour l'instant"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" /> Taux de réponses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.tauxReponses}%</div>
            <Progress value={data.tauxReponses} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalTraitees} question(s) traitée(s) sur {data.totalQuestions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Score moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.scoreMoyen !== null ? `${data.scoreMoyen}%` : "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">Moyenne des modules évalués</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail par module</CardTitle>
        </CardHeader>
        <CardContent>
          {data.modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité enregistrée pour cet apprenant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Module</th>
                    <th className="py-2 px-3 font-medium">Questions traitées</th>
                    <th className="py-2 px-3 font-medium">Taux</th>
                    <th className="py-2 px-3 font-medium">Score moyen</th>
                    <th className="py-2 px-3 font-medium">Temps moyen / question</th>
                    <th className="py-2 pl-3 font-medium">Temps total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.modules.map((m) => {
                    const taux = m.questionsTotal > 0 ? Math.round((m.questionsTraitees / m.questionsTotal) * 100) : 0;
                    const moyen = m.questionsChronometrees > 0 ? Math.round(m.tempsTotalSec / m.questionsChronometrees) : null;
                    return (
                      <tr key={m.moduleId} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{m.nom}</td>
                        <td className="py-2 px-3">
                          {m.questionsTotal > 0 ? `${m.questionsTraitees} / ${m.questionsTotal}` : "—"}
                        </td>
                        <td className="py-2 px-3">
                          {m.questionsTotal > 0 ? (
                            <Badge variant={taux >= 80 ? "default" : taux >= 40 ? "secondary" : "outline"}>{taux}%</Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 px-3">{m.scorePct !== null ? `${m.scorePct}%` : "—"}</td>
                        <td className="py-2 px-3">{moyen !== null ? `${moyen} s` : "—"}</td>
                        <td className="py-2 pl-3">{formatDuree(m.tempsTotalSec)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Le temps par question est mesuré depuis la mise en place du suivi : les sessions antérieures ne sont pas comptabilisées.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SuiviEcranTab;
