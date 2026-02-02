import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const events = [
  { id: 1, title: "React Avancé - M3", date: 3, time: "14:00", duration: 3, color: "bg-primary" },
  { id: 2, title: "UX Design", date: 4, time: "09:00", duration: 4, color: "bg-accent" },
  { id: 3, title: "Python DS", date: 5, time: "10:00", duration: 6, color: "bg-success" },
  { id: 4, title: "Management", date: 6, time: "14:00", duration: 3, color: "bg-warning" },
  { id: 5, title: "React Avancé - M4", date: 10, time: "14:00", duration: 3, color: "bg-primary" },
];

const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function PlanningCalendar() {
  const [currentMonth] = useState("Février 2026");

  // Generate calendar days (simplified)
  const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const day = i - 5; // Start from previous month
    return {
      date: day > 0 && day <= 28 ? day : null,
      isCurrentMonth: day > 0 && day <= 28,
      isToday: day === 2,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Calendar Header */}
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
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle session
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-border">
          {days.map((day) => (
            <div key={day} className="px-4 py-3 text-sm font-medium text-muted-foreground text-center bg-muted/50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <div 
              key={index} 
              className={`min-h-[120px] p-2 border-b border-r border-border last:border-r-0 ${
                !day.isCurrentMonth ? "bg-muted/30" : ""
              }`}
            >
              {day.date && (
                <>
                  <span className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${
                    day.isToday 
                      ? "bg-primary text-primary-foreground font-semibold" 
                      : "text-foreground"
                  }`}>
                    {day.date}
                  </span>
                  <div className="mt-1 space-y-1">
                    {events
                      .filter(e => e.date === day.date)
                      .map(event => (
                        <div 
                          key={event.id}
                          className={`${event.color} text-white text-xs px-2 py-1 rounded truncate cursor-pointer hover:opacity-90 transition-opacity`}
                        >
                          {event.time} {event.title}
                        </div>
                      ))
                    }
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary" />
          <span className="text-muted-foreground">Développement</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-accent" />
          <span className="text-muted-foreground">Design</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-success" />
          <span className="text-muted-foreground">Data</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-warning" />
          <span className="text-muted-foreground">Soft Skills</span>
        </div>
      </div>
    </div>
  );
}
