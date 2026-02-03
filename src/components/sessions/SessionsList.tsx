import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, MapPin } from "lucide-react";
import { SessionForm } from "./SessionForm";

const sessions = [
  {
    id: 1,
    title: "Session React Avancé - Groupe A",
    formation: "Développement Web React",
    date: "15 Jan 2026",
    horaire: "09:00 - 17:00",
    lieu: "Salle A1",
    formateur: "Jean Dupont",
    participants: 12,
    maxParticipants: 15,
    status: "confirmed"
  },
  {
    id: 2,
    title: "Session Excel Débutant",
    formation: "Bureautique Excel",
    date: "18 Jan 2026",
    horaire: "14:00 - 17:00",
    lieu: "Salle B2",
    formateur: "Marie Martin",
    participants: 8,
    maxParticipants: 10,
    status: "confirmed"
  },
  {
    id: 3,
    title: "Session Management - Groupe B",
    formation: "Management d'équipe",
    date: "20 Jan 2026",
    horaire: "09:00 - 12:00",
    lieu: "En ligne",
    formateur: "Pierre Bernard",
    participants: 6,
    maxParticipants: 20,
    status: "pending"
  },
  {
    id: 4,
    title: "Session Photoshop Intermédiaire",
    formation: "Design Graphique",
    date: "22 Jan 2026",
    horaire: "10:00 - 16:00",
    lieu: "Salle C1",
    formateur: "Sophie Lefebvre",
    participants: 10,
    maxParticipants: 12,
    status: "confirmed"
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "confirmed":
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Confirmée</Badge>;
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">En attente</Badge>;
    case "cancelled":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Annulée</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export function SessionsList() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sessions</h1>
          <p className="text-muted-foreground">Gérez vos sessions de formation</p>
        </div>
        <SessionForm />
      </div>

      <div className="grid gap-4">
        {sessions.map((session) => (
          <Card key={session.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg text-foreground">{session.title}</h3>
                    {getStatusBadge(session.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{session.formation}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{session.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{session.horaire}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>{session.lieu}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{session.participants}/{session.maxParticipants} participants</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{session.formateur}</p>
                  <p className="text-xs text-muted-foreground">Formateur</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
