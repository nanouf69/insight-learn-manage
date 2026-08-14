import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ExternalLink, Users, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type SessionRow = {
  id: string;
  nom: string | null;
  type_session: string | null;
  date_debut: string | null;
  date_fin: string | null;
  lieu: string | null;
  heure_debut: string | null;
  heure_fin: string | null;
};

export function SessionsTab({ apprenant }: { apprenant: { id: string } }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Array<SessionRow & { participants: number }>>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: links } = await supabase
        .from("session_apprenants")
        .select("session_id, sessions:session_id(id, nom, type_session, date_debut, date_fin, lieu, heure_debut, heure_fin)")
        .eq("apprenant_id", apprenant.id);

      const uniq = new Map<string, SessionRow>();
      (links || []).forEach((l: any) => {
        if (l.sessions?.id) uniq.set(l.sessions.id, l.sessions);
      });
      const ids = Array.from(uniq.keys());
      let counts: Record<string, number> = {};
      if (ids.length) {
        const { data: allLinks } = await supabase
          .from("session_apprenants")
          .select("session_id")
          .in("session_id", ids);
        (allLinks || []).forEach((r: any) => {
          counts[r.session_id] = (counts[r.session_id] || 0) + 1;
        });
      }
      const list = Array.from(uniq.values())
        .map((s) => ({ ...s, participants: counts[s.id] || 0 }))
        .sort((a, b) => (b.date_debut || "").localeCompare(a.date_debut || ""));
      setSessions(list);
      setLoading(false);
    })();
  }, [apprenant.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement des sessions...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Cet apprenant n'est inscrit à aucune session.
      </Card>
    );
  }

  const fmt = (d?: string | null) => (d ? format(new Date(d), "dd MMM yyyy", { locale: fr }) : "-");

  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <Card
          key={s.id}
          className="p-4 hover:shadow-md transition cursor-pointer"
          onClick={() => navigate(`/sessions/${s.id}`, { state: { from: window.location.pathname + window.location.search } })}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base">{s.nom || "Session sans nom"}</h3>
                {s.type_session && <Badge variant="secondary">{s.type_session}</Badge>}
              </div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {fmt(s.date_debut)} → {fmt(s.date_fin)}
                  {s.heure_debut && s.heure_fin && (
                    <span className="ml-1">({s.heure_debut.slice(0, 5)}-{s.heure_fin.slice(0, 5)})</span>
                  )}
                </div>
                {s.lieu && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {s.lieu}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {s.participants} apprenant{s.participants > 1 ? "s" : ""}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/sessions/${s.id}`, { state: { from: window.location.pathname + window.location.search } });
              }}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Ouvrir
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
