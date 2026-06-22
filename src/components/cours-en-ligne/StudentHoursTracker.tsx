import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useStudentEffectiveHours } from "@/hooks/useStudentEffectiveHours";

interface StudentHoursTrackerProps {
  apprenantId: string | null | undefined;
  typeApprenant: string | null | undefined;
  dateDebutFormation?: string | null;
  dateFinFormation?: string | null;
  dateDebutCoursEnLigne?: string | null;
  dateFinCoursEnLigne?: string | null;
}

export default function StudentHoursTracker({
  apprenantId,
  typeApprenant,
  dateDebutFormation,
  dateFinFormation,
  dateDebutCoursEnLigne,
  dateFinCoursEnLigne,
}: StudentHoursTrackerProps) {
  const { loading, formattedDone, formattedRemaining, requis, pct } = useStudentEffectiveHours(
    apprenantId,
    typeApprenant,
    { dateDebutFormation, dateFinFormation, dateDebutCoursEnLigne, dateFinCoursEnLigne },
  );

  if (loading || !apprenantId) {
    return null;
  }

  if (requis === 0) {
    return null;
  }

  const isComplete = pct >= 100;
  const isLow = !isComplete && pct < 50;

  return (
    <Card className="mb-8 border shadow-sm overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">Mes heures e-learning</h3>
              {isComplete ? (
                <Badge className="bg-green-600 text-white border-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Objectif atteint
                </Badge>
              ) : isLow ? (
                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/30">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  En retard
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Le temps affiché est compté <strong>uniquement</strong> lorsque vous ouvrez un module, un exercice ou un quiz.
            </p>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center">
              <div className="text-2xl font-bold">{formattedDone}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Réalisées</div>
            </div>
            <div className="text-muted-foreground text-xl">/</div>
            <div className="text-center">
              <div className="text-2xl font-bold">{requis}h</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Requises</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isComplete ? "text-green-600" : isLow ? "text-orange-600" : ""}`}>
                {isComplete ? "Terminé" : formattedRemaining}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Restantes</div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-3">
            <Progress value={pct} className="h-2.5 flex-1" />
            <span className="text-sm font-semibold w-12 text-right">{Math.round(pct)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
