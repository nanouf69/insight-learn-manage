import { Calendar, Clock, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const sessions = [
  {
    id: 1,
    title: "React Avancé - Module 3",
    date: "Aujourd'hui",
    time: "14:00 - 17:00",
    participants: 12,
    location: "Salle A / Visio",
    status: "upcoming",
  },
  {
    id: 2,
    title: "UX Design Fondamentaux",
    date: "Demain",
    time: "09:00 - 12:30",
    participants: 8,
    location: "En ligne",
    status: "upcoming",
  },
  {
    id: 3,
    title: "Python pour Data Science",
    date: "Mer. 5 Feb",
    time: "10:00 - 16:00",
    participants: 15,
    location: "Salle B",
    status: "scheduled",
  },
];

export function UpcomingSessions() {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Sessions à venir</h3>
        <Button variant="ghost" size="sm" className="text-primary">
          Voir tout
        </Button>
      </div>
      <div className="space-y-3">
        {sessions.map((session) => (
          <div 
            key={session.id} 
            className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-foreground">{session.title}</h4>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {session.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {session.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {session.participants}
                  </span>
                </div>
              </div>
              <span className="badge-primary">{session.location}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
