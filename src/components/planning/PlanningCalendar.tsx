import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { PlanningForm } from "./PlanningForm";

const events = [
  { id: 1, title: "VTC - Yacob", date: 3, time: "08:00", duration: 2, color: "bg-primary" },
  { id: 2, title: "VTC - Candidat 2", date: 3, time: "08:00", duration: 2, color: "bg-primary" },
  { id: 3, title: "VTC - Candidat 3", date: 3, time: "08:00", duration: 2, color: "bg-primary" },
  { id: 4, title: "VTC - Candidat 4", date: 3, time: "08:00", duration: 2, color: "bg-primary" },
  { id: 5, title: "VTC - Candidat 5", date: 3, time: "08:00", duration: 2, color: "bg-primary" },
  { id: 6, title: "Formation TAXI", date: 5, time: "09:00", duration: 4, color: "bg-accent" },
  { id: 7, title: "Formation TAXI", date: 10, time: "09:00", duration: 4, color: "bg-accent" },
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
        <PlanningForm />
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
          <span className="text-muted-foreground">VTC</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-accent" />
          <span className="text-muted-foreground">TAXI</span>
        </div>
      </div>
    </div>
  );
}
