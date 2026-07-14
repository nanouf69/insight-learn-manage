import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle2, CalendarDays } from "lucide-react";
import { useStudentEffectiveHours } from "@/hooks/useStudentEffectiveHours";
import { ALL_DATES_EXAMEN_THEORIQUE } from "@/lib/examDatesConfig";
import { parseFrenchDate } from "@/lib/filterPastDates";
import { supabase } from "@/integrations/supabase/client";

interface StudentHoursTrackerProps {
  apprenantId: string | null | undefined;
  typeApprenant: string | null | undefined;
  dateDebutFormation?: string | null;
  dateFinFormation?: string | null;
  dateDebutCoursEnLigne?: string | null;
  dateFinCoursEnLigne?: string | null;
  dateExamenTheorique?: string | null;
  resultatExamen?: string | null;
}

function getNextUpcomingExamTheorique(): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = ALL_DATES_EXAMEN_THEORIQUE
    .map(d => ({ ...d, parsed: parseFrenchDate(d.date) }))
    .filter(d => d.parsed && d.parsed >= today)
    .sort((a, b) => (a.parsed!.getTime() - b.parsed!.getTime()));
  return upcoming[0]?.date ?? null;
}

export default function StudentHoursTracker({
  apprenantId,
  typeApprenant,
  dateDebutFormation,
  dateFinFormation,
  dateDebutCoursEnLigne,
  dateFinCoursEnLigne,
  dateExamenTheorique,
  resultatExamen,
}: StudentHoursTrackerProps) {
  const { loading, formattedDone, formattedRemaining, requis, pct } = useStudentEffectiveHours(
    apprenantId,
    typeApprenant,
    { dateDebutFormation, dateFinFormation, dateDebutCoursEnLigne, dateFinCoursEnLigne },
  );

  // Si l'élève a déjà un résultat à l'examen théorique (admis/ajourné), on ne le réinscrit pas
  const examAlreadyTaken = (() => {
    const r = (resultatExamen || "").trim().toLowerCase();
    return r === "oui" || r === "admis" || r === "non" || r === "ajourne" || r === "ajourné";
  })();

  // Auto-update DB: si la date enregistrée est passée, basculer sur la prochaine session
  const updatedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!apprenantId) return;
    if (examAlreadyTaken) return;
    const saved = (dateExamenTheorique || "").trim();
    if (!saved) return;
    const savedParsed = parseFrenchDate(saved);
    if (!savedParsed) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (savedParsed >= today) return;
    const next = getNextUpcomingExamTheorique();
    if (!next || next === saved) return;
    const key = `${apprenantId}::${saved}->${next}`;
    if (updatedKeyRef.current === key) return;
    updatedKeyRef.current = key;
    supabase
      .from("apprenants")
      .update({ date_examen_theorique: next })
      .eq("id", apprenantId)
      .then(({ error }) => {
        if (error) console.error("[StudentHoursTracker] auto-update date_examen_theorique failed", error);
      });
  }, [apprenantId, dateExamenTheorique, examAlreadyTaken]);

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
              Le temps affiché correspond à vos <strong>sessions de connexion pendant lesquelles vous avez consulté un module, un exercice ou un quiz</strong> (plafonné à 7h par session), <strong>uniquement sur la période de votre formation</strong>.
            </p>
            <p className="text-sm text-red-600 font-semibold mt-1">
              Vous devez terminer tous les modules pour valider votre formation.
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

        {(() => {
          const saved = (dateExamenTheorique || "").trim();
          const savedParsed = saved ? parseFrenchDate(saved) : null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isPast = savedParsed ? savedParsed < today : false;
          // Si l'élève a déjà passé l'examen, on garde sa date d'origine et on n'affiche pas de "prochaine session"
          const displayDate = examAlreadyTaken
            ? (saved || null)
            : (!saved || isPast ? getNextUpcomingExamTheorique() : saved);
          if (!displayDate) return null;
          const r = (resultatExamen || "").trim().toLowerCase();
          const isAdmis = r === "oui" || r === "admis";
          const isAjourne = r === "non" || r === "ajourne" || r === "ajourné";
          return (
            <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground">Date d'examen théorique :</span>
              <span className="font-semibold">{displayDate}</span>
              {examAlreadyTaken ? (
                <Badge variant="outline" className={isAdmis
                  ? "text-green-700 border-green-200 bg-green-50 dark:bg-green-950/30"
                  : "text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/30"}>
                  {isAdmis ? "Examen passé — Admis" : isAjourne ? "Examen passé — Ajourné" : "Examen passé"}
                </Badge>
              ) : isPast && saved ? (
                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/30">
                  Prochaine session (votre date {saved} est passée)
                </Badge>
              ) : null}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
