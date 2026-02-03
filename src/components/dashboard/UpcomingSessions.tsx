import { Calendar, Clock, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const sessions = [
  {
    id: 1,
    title: "Formation TAXI - Session 1",
    date: "Aujourd'hui",
    time: "09:00 - 17:00",
    participants: 8,
    location: "Salle A",
    status: "upcoming",
  },
  {
    id: 2,
    title: "Formation TAXI - Session 2",
    date: "Demain",
    time: "09:00 - 17:00",
    participants: 6,
    location: "Salle A",
    status: "upcoming",
  },
  {
    id: 3,
    title: "Pratique TAXI",
    date: "Lun. 10 Feb",
    time: "08:00 - 12:00",
    participants: 4,
    location: "Véhicule école",
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
