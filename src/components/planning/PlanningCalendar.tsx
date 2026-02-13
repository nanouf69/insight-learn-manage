import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { PlanningForm } from "./PlanningForm";
import { supabase } from "@/integrations/supabase/client";

type DayPlan = {
  date: string;
  dateKey: string;
  type: "VTC" | "TAXI" | null;
  count: number;
  candidates: string[];
};

type Week = {
  label: string;
  days: DayPlan[];
};

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_NAMES = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];

function generateWeekdays(): Date[] {
  const start = new Date(2026, 1, 16); // Feb 16, 2026
  const end = new Date(2026, 2, 7);    // March 7
  const days: Date[] = [];
  let current = new Date(start);
  while (current < end) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function PlanningCalendar() {
  const [currentMonth] = useState("Février 2026");
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReservations() {
      // Fetch all reservations with apprenant info
      const { data: reservations } = await supabase
        .from("reservations_pratique")
        .select("date_choisie, type_formation, apprenant_id");

      // Fetch apprenants for names
      const apprenantIds = [...new Set((reservations || []).map(r => r.apprenant_id))];
      let apprenantMap: Record<string, { nom: string; prenom: string }> = {};
      
      if (apprenantIds.length > 0) {
        const { data: apprenants } = await supabase
          .from("apprenants")
          .select("id, nom, prenom")
          .in("id", apprenantIds);
        
        (apprenants || []).forEach(a => {
          apprenantMap[a.id] = { nom: a.nom, prenom: a.prenom };
        });
      }

      // Group reservations by date
      const byDate: Record<string, { type: string; candidates: string[] }> = {};
      (reservations || []).forEach(r => {
        if (!byDate[r.date_choisie]) {
          byDate[r.date_choisie] = { type: r.type_formation, candidates: [] };
        }
        const app = apprenantMap[r.apprenant_id];
        if (app) {
          byDate[r.date_choisie].candidates.push(`${app.nom} ${app.prenom}`);
        }
      });

      // Build weeks
      const weekdays = generateWeekdays();
      const builtWeeks: Week[] = [];
      let currentWeek: DayPlan[] = [];
      let weekNum = 1;

      weekdays.forEach((d, i) => {
        const key = d.toISOString().slice(0, 10);
        const dayData = byDate[key];
        
        currentWeek.push({
          date: `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`,
          dateKey: key,
          type: dayData ? (dayData.type.toUpperCase() as "VTC" | "TAXI") : null,
          count: dayData ? dayData.candidates.length : 0,
          candidates: dayData ? dayData.candidates : [],
        });

        if (d.getDay() === 5 || i === weekdays.length - 1) {
          builtWeeks.push({ label: `Semaine ${weekNum}`, days: currentWeek });
          currentWeek = [];
          weekNum++;
        }
      });

      setWeeks(builtWeeks);
      setLoading(false);
    }

    fetchReservations();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-foreground">{currentMonth}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm">Aujourd'hui</Button>
        </div>
        <PlanningForm />
      </div>

      {/* Weeks */}
      {weeks.map((week) => (
        <div key={week.label} className="space-y-3">
          <h3 className="text-base font-semibold text-foreground italic">{week.label}</h3>
          <div className="grid grid-cols-5 gap-3">
            {week.days.map((day) => (
              <div
                key={day.dateKey}
                className="bg-card border border-border rounded-lg p-3 min-h-[180px] flex flex-col"
              >
                <div className="text-sm font-semibold text-foreground mb-2 text-center border-b border-border pb-2">
                  {day.date}
                </div>
                {day.type ? (
                  <div className="flex flex-col gap-1">
                    <span
                      className={`text-xs font-bold ${
                        day.type === "VTC" ? "text-primary" : "text-amber-600"
                      }`}
                    >
                      {day.type} ({day.count})
                    </span>
                    {day.candidates.map((name, i) => (
                      <span key={i} className="text-xs text-foreground leading-tight">
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground italic">Libre</span>
                  </div>
                )}
              </div>
            ))}
            {/* Pad empty cells if week has fewer than 5 days */}
            {Array.from({ length: 5 - week.days.length }).map((_, i) => (
              <div key={`empty-${i}`} className="border rounded-lg p-3 min-h-[180px] bg-muted/10" />
            ))}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary" />
          <span className="text-muted-foreground">VTC</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-muted-foreground">TAXI</span>
        </div>
      </div>
    </div>
  );
}
