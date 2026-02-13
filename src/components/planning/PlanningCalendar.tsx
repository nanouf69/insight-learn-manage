import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { PlanningForm } from "./PlanningForm";

type DayPlan = {
  date: string;
  type: "VTC" | "TAXI" | null;
  count: number;
  candidates: string[];
};

type Week = {
  label: string;
  days: DayPlan[];
};

const weeks: Week[] = [
  {
    label: "Semaine 1",
    days: [
      { date: "Lun 16 fév", type: "VTC", count: 4, candidates: ["Abdellah-berhail Ayoub", "ALLAOUI MOUSTOIPHA", "Alti MOHAMMED SALAH", "AROUMOUGAM Ségar"] },
      { date: "Mar 17 fév", type: "VTC", count: 4, candidates: ["BALA Oussama", "BARKAT Zakaria", "Belkaid Rim", "BELLACHE ABDERRAHMANE"] },
      { date: "Mer 18 fév", type: "VTC", count: 4, candidates: ["Benamara Kaouthar", "Felder Vivien", "Ghennai Soufiane", "Gindre Anthony"] },
      { date: "Jeu 19 fév", type: "VTC", count: 4, candidates: ["Gombe Evrard", "Hadj mokhnache Amar", "haider amri", "Kout Ahmed"] },
      { date: "Ven 20 fév", type: "VTC", count: 4, candidates: ["Lameche Mourad", "Loic JEAN-PIERRE", "Lukudisa Manuel", "MADI OMAR"] },
    ],
  },
  {
    label: "Semaine 2",
    days: [
      { date: "Lun 23 fév", type: "VTC", count: 4, candidates: ["Mahersia Nour", "Mamoi Amo", "Mbele Tuzaya Ernoult", "Nadarou Sarah"] },
      { date: "Mar 24 fév", type: "VTC", count: 4, candidates: ["Pont Christian", "Sahbi Jessim", "Slassi Yacine", "STEPANYAN LEVON"] },
      { date: "Mer 25 fév", type: "VTC", count: 1, candidates: ["YACOB TESFAZIAN ALEXAN..."] },
      { date: "Jeu 26 fév", type: "TAXI", count: 4, candidates: ["Aiello Franck", "BENNOUNA Medjoub", "Bonche Evan", "Bouberka sami"] },
      { date: "Ven 27 fév", type: "TAXI", count: 4, candidates: ["DANOUN David", "Ghouila Merwan", "Hamadouche Mahfoud", "HOSNI Zied"] },
    ],
  },
  {
    label: "Semaine 3",
    days: [
      { date: "Lun 2 mar", type: "TAXI", count: 4, candidates: ["MERROUANI Morjane", "Racherache Salah", "Reghi Akim", "SOUSSI LHASSAN"] },
      { date: "Mar 3 mar", type: null, count: 0, candidates: [] },
      { date: "Mer 4 mar", type: null, count: 0, candidates: [] },
      { date: "Jeu 5 mar", type: null, count: 0, candidates: [] },
      { date: "Ven 6 mar", type: null, count: 0, candidates: [] },
    ],
  },
];

export function PlanningCalendar() {
  const [currentMonth] = useState("Février 2026");

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
                key={day.date}
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
