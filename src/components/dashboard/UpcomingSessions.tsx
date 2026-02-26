import { Calendar, Clock, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export function UpcomingSessions() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["upcoming-sessions"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("sessions")
        .select(`
          id, nom, date_debut, date_fin, lieu, type_session, heure_debut, heure_fin, places_disponibles,
          session_apprenants(id)
        `)
        .gte("date_debut", today)
        .order("date_debut", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Sessions à venir</h3>
        <Button variant="ghost" size="sm" className="text-primary">
          Voir tout
        </Button>
      </div>
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune session à venir</p>
        ) : (
          sessions.map((session) => {
            const dateDebut = parseISO(session.date_debut);
            const dateFin = parseISO(session.date_fin);
            const dateLabel = format(dateDebut, "EEE dd MMM yyyy", { locale: fr });
            const participantCount = session.session_apprenants?.length || 0;
            const heures = session.heure_debut && session.heure_fin
              ? `${session.heure_debut} - ${session.heure_fin}`
              : format(dateDebut, "dd/MM") + " → " + format(dateFin, "dd/MM");

            return (
              <div
                key={session.id}
                className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">
                      {session.nom || `Session ${session.type_session}`}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {dateLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {heures}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {participantCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
