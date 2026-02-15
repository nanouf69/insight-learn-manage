import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { PlanningForm } from "./PlanningForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateEmargementPratiquePDF } from "@/lib/pdf/emargement-pratique";

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_NAMES = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];

function generateWeekdays(): Date[] {
  const start = new Date(2026, 1, 16);
  const end = new Date(2026, 2, 7);
  const days: Date[] = [];
  let current = new Date(start);
  while (current < end) {
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

type CandidateInfo = {
  name: string;
  type: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  heure?: string;
  pasInscritExamen?: boolean;
};

type ExamCandidate = {
  name: string;
  type: string;
  heure: string;
};

type DayInfo = {
  date: Date;
  dateKey: string;
  label: string;
  expectedType: 'vtc' | 'taxi' | 'examen';
  reservedCandidates: CandidateInfo[];
  examCandidates: ExamCandidate[];
};

type WeekInfo = {
  label: string;
  days: DayInfo[];
};

export function PlanningCalendar() {
  const [currentMonth] = useState("Février 2026");
  const [weeks, setWeeks] = useState<WeekInfo[]>([]);
  const [loading, setLoading] = useState(true);
  

  const toLocalDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };


  useEffect(() => {
    async function fetchData() {
      // Fetch reservations
      const { data: reservations } = await supabase
        .from("reservations_pratique")
        .select("date_choisie, type_formation, apprenant_id");

      // Fetch apprenant details (including exam fields)
      const { data: allApprenants } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, telephone, email, date_examen_pratique, heure_examen_pratique, formation_choisie");

      const appMap: Record<string, { nom: string; prenom: string; telephone: string; email: string; hasExam: boolean }> = {};
      (allApprenants || []).forEach(a => {
        appMap[a.id] = { nom: a.nom, prenom: a.prenom, telephone: a.telephone || '', email: a.email || '', hasExam: !!(a.date_examen_pratique) };
      });

      // Group reservations by date
      const byDate: Record<string, CandidateInfo[]> = {};
      (reservations || []).forEach(r => {
        if (!byDate[r.date_choisie]) byDate[r.date_choisie] = [];
        const app = appMap[r.apprenant_id];
        if (app) {
          byDate[r.date_choisie].push({
            name: `${app.nom} ${app.prenom}`,
            type: r.type_formation,
            nom: app.nom,
            prenom: app.prenom,
            telephone: app.telephone,
            email: app.email,
            pasInscritExamen: !app.hasExam,
          });
        }
      });

      // Group exam candidates by date
      const examByDate: Record<string, ExamCandidate[]> = {};
      (allApprenants || []).forEach(a => {
        if (a.date_examen_pratique && a.heure_examen_pratique) {
          if (!examByDate[a.date_examen_pratique]) examByDate[a.date_examen_pratique] = [];
          const type = (a.formation_choisie || '').toLowerCase().includes('taxi') ? 'TAXI' : 'VTC';
          examByDate[a.date_examen_pratique].push({
            name: `${a.prenom} ${a.nom}`,
            type,
            heure: a.heure_examen_pratique,
          });
        }
      });
      // Sort exam candidates by time
      Object.values(examByDate).forEach(list => list.sort((a, b) => a.heure.localeCompare(b.heure)));

      // Build day list
      const weekdays = generateWeekdays();
      const builtWeeks: WeekInfo[] = [];
      let currentWeek: DayInfo[] = [];
      let weekNum = 1;

      weekdays.forEach((d, i) => {
        const key = toLocalDateKey(d);
        currentWeek.push({
          date: d,
          dateKey: key,
          label: `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`,
          expectedType: d.getMonth() === 2 ? 'examen' : (d.getMonth() === 1 && d.getDate() >= 25) ? 'taxi' : 'vtc',
          reservedCandidates: byDate[key] || [],
          examCandidates: examByDate[key] || [],
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
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
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
        <div className="flex items-center gap-2">
          <PlanningForm />
        </div>
      </div>

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
                  {day.label}
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  {day.expectedType === 'examen' ? (
                    <>
                      <span className="text-xs font-bold text-destructive">📋 Examens pratiques</span>
                      {day.examCandidates.length > 0 ? (
                        (() => {
                          const byTime: Record<string, ExamCandidate[]> = {};
                          day.examCandidates.forEach(c => {
                            if (!byTime[c.heure]) byTime[c.heure] = [];
                            byTime[c.heure].push(c);
                          });
                          return Object.entries(byTime).sort(([a], [b]) => a.localeCompare(b)).map(([heure, candidates]) => (
                            <div key={heure} className="mt-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">{heure}</span>
                              {candidates.map((c, i) => (
                                <span key={i} className={`text-xs leading-tight block ${c.type === 'TAXI' ? 'text-amber-600' : 'text-primary'}`}>
                                  {c.name} <span className="text-[10px] font-medium">({c.type})</span>
                                </span>
                              ))}
                            </div>
                          ));
                        })()
                      ) : (
                        <span className="text-xs text-muted-foreground italic mt-1">Aucun candidat programmé</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className={`text-xs font-bold ${day.expectedType === 'vtc' ? 'text-primary' : 'text-amber-600'}`}>
                        Formation pratique {day.expectedType === 'vtc' ? 'VTC' : 'TAXI'}
                      </span>
                      {day.reservedCandidates.length > 0 ? (
                        day.reservedCandidates.map((c, i) => (
                          <span key={i} className={`text-xs leading-tight ${c.pasInscritExamen ? 'text-destructive font-bold' : 'text-foreground'}`}>
                            {c.pasInscritExamen && '⚠️ '}{c.name}
                            {c.pasInscritExamen && <span className="block text-[10px] text-destructive font-normal">Non inscrit à l'examen</span>}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic mt-1">En attente de réservations</span>
                      )}
                    </>
                  )}
                </div>
                {day.expectedType !== 'examen' && day.reservedCandidates.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full gap-1 text-xs h-7"
                    onClick={() => {
                      generateEmargementPratiquePDF(
                        day.date,
                        day.expectedType as 'vtc' | 'taxi',
                        day.reservedCandidates.map(c => ({
                          nom: c.nom,
                          prenom: c.prenom,
                          telephone: c.telephone,
                          email: c.email,
                        }))
                      );
                      toast.success("Feuille d'émargement téléchargée");
                    }}
                  >
                    <Download className="h-3 w-3" />
                    Émargement
                  </Button>
                )}
              </div>
            ))}
            {Array.from({ length: 5 - week.days.length }).map((_, i) => (
              <div key={`empty-${i}`} className="border rounded-lg p-3 min-h-[180px] bg-muted/10" />
            ))}
          </div>
        </div>
      ))}

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
