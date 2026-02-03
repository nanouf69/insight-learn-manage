import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, MapPin } from "lucide-react";
import { SessionForm } from "./SessionForm";

const sessions = [
  // Formation VTC Initial (250H = ~7 semaines)
  {
    id: 1,
    title: "Formation VTC Initial - Session 1",
    formation: "Formation initiale VTC (250H)",
    dateDebut: "20 Jan 2026",
    dateFin: "06 Mars 2026",
    lieu: "Présentiel",
    formateur: "Jean Dupont",
    participants: 8,
    maxParticipants: 12,
    status: "confirmed"
  },
  {
    id: 2,
    title: "Formation VTC Initial - Session 2",
    formation: "Formation initiale VTC (250H)",
    dateDebut: "03 Fév 2026",
    dateFin: "20 Mars 2026",
    lieu: "Présentiel",
    formateur: "Jean Dupont",
    participants: 10,
    maxParticipants: 12,
    status: "confirmed"
  },
  {
    id: 3,
    title: "Formation VTC Initial - Session 3",
    formation: "Formation initiale VTC (250H)",
    dateDebut: "17 Fév 2026",
    dateFin: "03 Avr 2026",
    lieu: "Présentiel",
    formateur: "Marie Martin",
    participants: 5,
    maxParticipants: 12,
    status: "pending"
  },
  {
    id: 4,
    title: "Formation VTC Initial - Session 4",
    formation: "Formation initiale VTC (250H)",
    dateDebut: "03 Mars 2026",
    dateFin: "17 Avr 2026",
    lieu: "Présentiel",
    formateur: "Jean Dupont",
    participants: 0,
    maxParticipants: 12,
    status: "pending"
  },
  // Formation TAXI Initial (200H = ~6 semaines)
  {
    id: 5,
    title: "Formation TAXI Initial - Session 1",
    formation: "Formation initiale TAXI (200H)",
    dateDebut: "27 Jan 2026",
    dateFin: "06 Mars 2026",
    lieu: "Présentiel",
    formateur: "Pierre Bernard",
    participants: 6,
    maxParticipants: 10,
    status: "confirmed"
  },
  {
    id: 6,
    title: "Formation TAXI Initial - Session 2",
    formation: "Formation initiale TAXI (200H)",
    dateDebut: "10 Fév 2026",
    dateFin: "20 Mars 2026",
    lieu: "Présentiel",
    formateur: "Pierre Bernard",
    participants: 4,
    maxParticipants: 10,
    status: "pending"
  },
  {
    id: 7,
    title: "Formation TAXI Initial - Session 3",
    formation: "Formation initiale TAXI (200H)",
    dateDebut: "24 Fév 2026",
    dateFin: "03 Avr 2026",
    lieu: "Présentiel",
    formateur: "Sophie Lefebvre",
    participants: 0,
    maxParticipants: 10,
    status: "pending"
  },
  // Passerelle TAXI vers VTC (14H = 2 jours)
  {
    id: 8,
    title: "Passerelle TAXI vers VTC - Session 1",
    formation: "Passerelle TAXI vers VTC (14H)",
    dateDebut: "05 Jan 2026",
    dateFin: "06 Jan 2026",
    lieu: "Présentiel",
    formateur: "Jean Dupont",
    participants: 5,
    maxParticipants: 8,
    status: "confirmed"
  },
  {
    id: 9,
    title: "Passerelle TAXI vers VTC - Session 2",
    formation: "Passerelle TAXI vers VTC (14H)",
    dateDebut: "02 Fév 2026",
    dateFin: "03 Fév 2026",
    lieu: "Présentiel",
    formateur: "Marie Martin",
    participants: 3,
    maxParticipants: 8,
    status: "pending"
  },
  // Passerelle VTC vers TAXI (14H = 2 jours)
  {
    id: 10,
    title: "Passerelle VTC vers TAXI - Session 1",
    formation: "Passerelle VTC vers TAXI (14H)",
    dateDebut: "12 Jan 2026",
    dateFin: "13 Jan 2026",
    lieu: "Présentiel",
    formateur: "Pierre Bernard",
    participants: 4,
    maxParticipants: 8,
    status: "confirmed"
  },
  {
    id: 11,
    title: "Passerelle VTC vers TAXI - Session 2",
    formation: "Passerelle VTC vers TAXI (14H)",
    dateDebut: "09 Fév 2026",
    dateFin: "10 Fév 2026",
    lieu: "Présentiel",
    formateur: "Sophie Lefebvre",
    participants: 0,
    maxParticipants: 8,
    status: "pending"
  },
  // Formation continue VTC (14H = 2 jours)
  {
    id: 12,
    title: "Formation continue VTC - Session 1",
    formation: "Formation continue VTC (14H)",
    dateDebut: "19 Jan 2026",
    dateFin: "20 Jan 2026",
    lieu: "Présentiel",
    formateur: "Jean Dupont",
    participants: 7,
    maxParticipants: 15,
    status: "confirmed"
  },
  // Formation continue TAXI (14H = 2 jours)
  {
    id: 13,
    title: "Formation continue TAXI - Session 1",
    formation: "Formation continue TAXI (14H)",
    dateDebut: "26 Jan 2026",
    dateFin: "27 Jan 2026",
    lieu: "Présentiel",
    formateur: "Marie Martin",
    participants: 6,
    maxParticipants: 15,
    status: "confirmed"
  },
  // Mobilité PMR (21H = 3 jours)
  {
    id: 14,
    title: "Mobilité PMR - Session 1",
    formation: "Mobilité - Capacité PMR (21H)",
    dateDebut: "16 Fév 2026",
    dateFin: "18 Fév 2026",
    lieu: "Présentiel",
    formateur: "Sophie Lefebvre",
    participants: 8,
    maxParticipants: 12,
    status: "pending"
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
              <div className="flex items-start gap-5">
                {/* Dates début - fin */}
                <div className="flex flex-col items-center justify-center min-w-[140px] p-3 rounded-xl bg-primary/10 text-primary">
                  <Calendar className="w-5 h-5 mb-1" />
                  <span className="text-sm font-bold">{session.dateDebut}</span>
                  <span className="text-xs text-primary/70">au</span>
                  <span className="text-sm font-bold">{session.dateFin}</span>
                </div>
                
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg text-foreground">{session.title}</h3>
                    {getStatusBadge(session.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{session.formation}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
